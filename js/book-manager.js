/**
 * BookManager - 蔵書の CRUD 管理を担当するクラス
 * kindle.json からのインポート、手動追加、削除機能を提供
 */
class BookManager {
    constructor() {
        this.library = {
            books: [],
            metadata: {
                lastImportDate: null,
                totalBooks: 0,
                manuallyAdded: 0,
                importedFromKindle: 0
            }
        };
    }

    /**
     * ライブラリデータを初期化・読み込み
     */
    async initialize() {
        // まずLocalStorageから確認
        const savedLibrary = localStorage.getItem('virtualBookshelf_library');
        if (savedLibrary) {
            try {
                this.library = JSON.parse(savedLibrary);
                // Data restored from localStorage
                return;
            } catch (error) {
                // LocalStorage loading error (fallback to file)
            }
        }
        
        // LocalStorageにない場合はlibrary.jsonを確認
        try {
            const response = await fetch('data/library.json');
            const libraryData = await response.json();
            // 新しいデータ構造から古い形式に変換
            this.library = {
                books: Object.entries(libraryData.books).map(([asin, book]) => ({
                    title: book.title,
                    authors: book.authors,
                    acquiredTime: book.acquiredTime,
                    readStatus: book.readStatus,
                    asin: asin,
                    productImage: book.productImage,
                    source: book.source,
                    addedDate: book.addedDate,
                    // 追加フィールドも含める
                    ...(book.memo && { memo: book.memo }),
                    ...(book.rating && { rating: book.rating }),
                    ...(book.updatedAsin && { updatedAsin: book.updatedAsin })
                })),
                metadata: {
                    totalBooks: libraryData.stats.totalBooks,
                    manuallyAdded: 0,
                    importedFromKindle: libraryData.stats.totalBooks,
                    lastImportDate: libraryData.exportDate
                }
            };
            // Data loaded from library.json
        } catch (error) {
            // ファイルが存在しない場合は空の蔵書で初期化（自動インポートしない）
            // Initializing empty library (no library.json found)
            this.library = {
                books: [],
                metadata: {
                    totalBooks: 0,
                    manuallyAdded: 0,
                    importedFromKindle: 0,
                    lastImportDate: null
                }
            };
        }
    }

    /**
     * kindle.jsonから初回データを移行
     */
    async initializeFromKindleData() {
        try {
            const response = await fetch('data/kindle.json');
            const kindleBooks = await response.json();
            
            this.library.books = kindleBooks.map(book => ({
                ...book,
                source: 'kindle_import',
                addedDate: Date.now()
            }));
            
            this.library.metadata = {
                lastImportDate: Date.now(),
                totalBooks: kindleBooks.length,
                manuallyAdded: 0,
                importedFromKindle: kindleBooks.length
            };
            
            await this.saveLibrary();
            // Kindle import completed
        } catch (error) {
            // Kindle.json loading error
        }
    }

    /**
     * kindle.jsonから新しいデータをインポート（重複チェック付き）
     */
    async importFromKindle(fileInput = null) {
        let kindleBooks;
        
        if (fileInput) {
            // ファイル入力からインポート
            const fileContent = await this.readFileContent(fileInput);
            kindleBooks = JSON.parse(fileContent);
        } else {
            // data/kindle.json からインポート
            const response = await fetch('data/kindle.json');
            kindleBooks = await response.json();
        }

        const importResults = {
            total: kindleBooks.length,
            added: 0,
            updated: 0,
            skipped: 0
        };

        for (const kindleBook of kindleBooks) {
            const existingBook = this.library.books.find(book => book.asin === kindleBook.asin);
            
            if (existingBook) {
                // 既存書籍の更新（新しい情報で上書き）
                if (this.shouldUpdateBook(existingBook, kindleBook)) {
                    Object.assign(existingBook, {
                        title: kindleBook.title,
                        authors: kindleBook.authors,
                        acquiredTime: kindleBook.acquiredTime,
                        readStatus: kindleBook.readStatus,
                        productImage: kindleBook.productImage
                    });
                    importResults.updated++;
                }
                else {
                    importResults.skipped++;
                }
            } else {
                // 新規書籍の追加
                this.library.books.push({
                    ...kindleBook,
                    source: 'kindle_import',
                    addedDate: Date.now()
                });
                importResults.added++;
            }
        }

        // メタデータ更新
        this.library.metadata.lastImportDate = Date.now();
        this.library.metadata.totalBooks = this.library.books.length;
        this.library.metadata.importedFromKindle = this.library.books.filter(book => book.source === 'kindle_import').length;

        await this.saveLibrary();
        
        console.log('インポート結果:', importResults);
        return importResults;
    }

    async importSelectedBooks(selectedBooks) {
        const importedBooks = [];
        const duplicateBooks = [];
        const errorBooks = [];
        
        // 既存の本のASINを取得
        const existingASINs = new Set(this.library.books.map(book => book.asin));
        
        for (const book of selectedBooks) {
            try {
                // 重複チェック
                if (existingASINs.has(book.asin)) {
                    duplicateBooks.push({
                        title: book.title,
                        asin: book.asin,
                        reason: '既に存在'
                    });
                    continue;
                }
                
                // 本を追加
                const bookToAdd = {
                    ...book,
                    source: 'kindle_import',
                    addedDate: Date.now()
                };
                
                this.library.books.push(bookToAdd);
                importedBooks.push(bookToAdd);
                
            } catch (error) {
                console.error(`本の処理エラー: ${book.title}`, error);
                errorBooks.push({
                    title: book.title,
                    asin: book.asin,
                    reason: error.message
                });
            }
        }
        
        // メタデータを更新
        this.library.metadata = {
            totalBooks: this.library.books.length,
            manuallyAdded: this.library.books.filter(b => b.source === 'manual_add').length,
            importedFromKindle: this.library.books.filter(b => b.source === 'kindle_import').length,
            lastImportDate: Date.now()
        };
        
        // ライブラリを保存
        await this.saveLibrary();
        
        console.log(`選択インポート完了: ${importedBooks.length}件追加`);
        
        return {
            success: true,
            total: selectedBooks.length,
            added: importedBooks.length,
            updated: 0, // 選択インポートでは更新なし
            skipped: duplicateBooks.length + errorBooks.length,
            imported: importedBooks,
            duplicates: duplicateBooks,
            errors: errorBooks
        };
    }


    /**
     * 書籍更新が必要かチェック
     */
    shouldUpdateBook(existingBook, newBook) {
        return existingBook.acquiredTime !== newBook.acquiredTime ||
               existingBook.readStatus !== newBook.readStatus ||
               existingBook.title !== newBook.title ||
               existingBook.productImage !== newBook.productImage;
    }

    /**
     * AmazonリンクからASINを抽出
     */
    extractASINFromUrl(url) {
        const patterns = [
            /amazon\.co\.jp\/dp\/([A-Z0-9]{10})/,
            /amazon\.co\.jp\/.*\/dp\/([A-Z0-9]{10})/,
            /amazon\.com\/dp\/([A-Z0-9]{10})/,
            /amazon\.com\/.*\/dp\/([A-Z0-9]{10})/,
            /\/([A-Z0-9]{10})(?:\/|\?|$)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    /**
     * ASIN から書籍情報を自動取得（複数APIの組み合わせ）
     */
    async fetchBookDataFromAmazon(asin) {
        console.log(`書籍情報取得開始: ${asin}`);

        try {
            // Google Books APIで検索（実際に動作）
            const googleBooksData = await this.fetchFromGoogleBooks(asin);
            if (googleBooksData && googleBooksData.title && googleBooksData.title !== 'タイトル未取得') {
                console.log('Google Books で取得成功:', googleBooksData);
                return googleBooksData;
            }
        } catch (error) {
            console.log('Google Books 検索失敗:', error.message);
        }

        // Google Books で見つからない場合はテンプレートを返す
        console.log('自動取得失敗、テンプレートで代替');
        return this.generateSmartBookData(asin);
    }

    /**
     * Google Books APIから書籍情報を取得
     */
    async fetchFromGoogleBooks(asin) {
        try {
            console.log(`Google Books API検索: ${asin}`);

            // ISBNとして検索
            let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${asin}`;
            let response = await fetch(url);
            let data = await response.json();

            console.log('Google Books ISBN検索結果:', data);

            if (data.items && data.items.length > 0) {
                const book = data.items[0].volumeInfo;
                console.log('見つかった書籍:', book);

                return {
                    asin: asin,
                    title: book.title || 'タイトル未取得',
                    authors: book.authors ? book.authors.join(', ') : '著者未取得',
                    acquiredTime: Date.now(),
                    readStatus: 'UNKNOWN',
                    productImage: book.imageLinks ?
                        (book.imageLinks.large || book.imageLinks.medium || book.imageLinks.thumbnail) :
                        `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`
                };
            }

            // ISBNで見つからない場合、一般検索を試行
            url = `https://www.googleapis.com/books/v1/volumes?q=${asin}`;
            response = await fetch(url);
            data = await response.json();

            console.log('Google Books 一般検索結果:', data);

            if (data.items && data.items.length > 0) {
                const book = data.items[0].volumeInfo;
                console.log('一般検索で見つかった書籍:', book);

                return {
                    asin: asin,
                    title: book.title || 'タイトル未取得',
                    authors: book.authors ? book.authors.join(', ') : '著者未取得',
                    acquiredTime: Date.now(),
                    readStatus: 'UNKNOWN',
                    productImage: book.imageLinks ?
                        (book.imageLinks.large || book.imageLinks.medium || book.imageLinks.thumbnail) :
                        `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`
                };
            }

            throw new Error('書籍が見つかりませんでした');

        } catch (error) {
            console.warn('Google Books API エラー:', error);
            throw error;
        }
    }


    /**
     * スマートな書籍データを生成（実用的なアプローチ）
     */
    generateSmartBookData(asin) {
        // ASIN形式で本の種類を推測し、より実用的な情報を提供
        let title, authors;

        if (asin.startsWith('B') && asin.length === 10) {
            // Kindle本の場合
            title = '';  // 空にして手動入力を促す
            authors = '';
        } else if (/^\d{9}[\dX]$/.test(asin)) {
            // ISBN-10の場合
            title = '';
            authors = '';
        } else {
            // その他
            title = '';
            authors = '';
        }

        return {
            asin: asin,
            title: title,
            authors: authors,
            acquiredTime: Date.now(),
            readStatus: 'UNKNOWN',
            productImage: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`
        };
    }



    /**
     * 表示・リンク用の有効なASINを取得
     */
    getEffectiveASIN(book) {
        return book.updatedAsin || book.asin;
    }

    /**
     * Amazon商品画像URLを取得
     */
    getProductImageUrl(book) {
        const effectiveAsin = this.getEffectiveASIN(book);
        return `https://images-na.ssl-images-amazon.com/images/P/${effectiveAsin}.01.L.jpg`;
    }

    /**
     * AmazonアフィリエイトリンクURLを生成
     */
    getAmazonUrl(book, affiliateId = null) {
        const effectiveAsin = this.getEffectiveASIN(book);
        let url = `https://www.amazon.co.jp/dp/${effectiveAsin}`;

        if (affiliateId) {
            url += `?tag=${affiliateId}`;
        }

        return url;
    }

    /**
     * 手動で書籍を追加
     */
    async addBookManually(bookData) {
        const asin = bookData.asin;

        if (!asin || !this.isValidASIN(asin)) {
            throw new Error('有効なASINが必要です');
        }

        // 重複チェック
        if (this.library.books.find(book => book.asin === asin)) {
            throw new Error('この本は既に蔵書に追加されています');
        }

        const newBook = {
            asin: asin,
            title: bookData.title || 'タイトル未設定',
            authors: bookData.authors || '著者未設定',
            acquiredTime: bookData.acquiredTime || Date.now(),
            readStatus: bookData.readStatus || 'UNKNOWN',
            productImage: bookData.productImage || `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.L.jpg`,
            source: 'manual_add',
            addedDate: Date.now()
        };

        this.library.books.push(newBook);
        this.library.metadata.totalBooks = this.library.books.length;
        this.library.metadata.manuallyAdded = this.library.books.filter(book => book.source === 'manual_add').length;

        await this.saveLibrary();
        return newBook;
    }

    /**
     * Amazonリンクから書籍を追加
     */
    async addBookFromAmazonUrl(url) {
        const asin = this.extractASINFromUrl(url);
        if (!asin) {
            throw new Error('有効なAmazonリンクではありません');
        }

        // Amazon APIから書籍情報を取得（簡易版）
        const bookData = await this.fetchBookDataFromAmazon(asin);
        return await this.addBookManually(bookData);
    }

    /**
     * 書籍を削除
     */
    async deleteBook(asin, hardDelete = false) {
        const bookIndex = this.library.books.findIndex(book => book.asin === asin);
        
        if (bookIndex === -1) {
            throw new Error('指定された書籍が見つかりません');
        }

        if (hardDelete) {
            // 完全削除
            this.library.books.splice(bookIndex, 1);
            this.library.metadata.totalBooks = this.library.books.length;
            
            // ソース別カウント更新
            this.library.metadata.manuallyAdded = this.library.books.filter(book => book.source === 'manual_add').length;
            this.library.metadata.importedFromKindle = this.library.books.filter(book => book.source === 'kindle_import').length;
        }

        await this.saveLibrary();
        return true;
    }

    /**
     * 蔵書を全てクリア
     */
    async clearAllBooks() {
        this.library.books = [];
        this.library.metadata = {
            totalBooks: 0,
            manuallyAdded: 0,
            importedFromKindle: 0,
            lastImportDate: null
        };
        
        await this.saveLibrary();
        return true;
    }

    /**
     * 書籍情報を更新
     */
    async updateBook(asin, updates) {
        const bookIndex = this.library.books.findIndex(book => book.asin === asin);
        if (bookIndex === -1) {
            throw new Error('指定された書籍が見つかりません');
        }

        const book = this.library.books[bookIndex];

        // undefinedの場合はプロパティを削除
        Object.keys(updates).forEach(key => {
            if (updates[key] === undefined) {
                delete book[key];
            } else {
                book[key] = updates[key];
            }
        });

        // メタデータを更新
        this.library.metadata.totalBooks = this.library.books.length;
        this.library.metadata.manuallyAdded = this.library.books.filter(b => b.source === 'manual_add').length;
        this.library.metadata.importedFromKindle = this.library.books.filter(b => b.source === 'kindle_import').length;

        await this.saveLibrary();
        return book;
    }

    /**
     * ASINの妥当性チェック
     */
    isValidASIN(asin) {
        return /^[A-Z0-9]{10}$/.test(asin);
    }

    /**
     * ファイル内容を読み取り
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * ライブラリデータをファイルに保存（エクスポート用）
     */
    async saveLibrary() {
        // LocalStorage に保存
        localStorage.setItem('virtualBookshelf_library', JSON.stringify(this.library));
        
        // ダウンロード可能な形でエクスポート
        return this.library;
    }


    /**
     * 統計情報を取得
     */
    getStatistics() {
        const books = this.library.books;
        return {
            total: books.length,
            read: books.filter(book => book.readStatus === 'READ').length,
            unread: books.filter(book => book.readStatus === 'UNKNOWN').length,
            manuallyAdded: books.filter(book => book.source === 'manual_add').length,
            importedFromKindle: books.filter(book => book.source === 'kindle_import').length,
            lastImportDate: this.library.metadata.lastImportDate
        };
    }

    /**
     * 全ての書籍を取得
     */
    getAllBooks() {
        return this.library.books;
    }

    /**
     * ASIN で書籍を検索
     */
    findBookByASIN(asin) {
        return this.library.books.find(book => book.asin === asin);
    }

    /**
     * タイトルまたは著者で書籍を検索
     */
    searchBooks(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.library.books.filter(book => 
            book.title.toLowerCase().includes(lowercaseQuery) ||
            book.authors.toLowerCase().includes(lowercaseQuery)
        );
    }
}

// BookManager の自動エクスポート処理（定期保存）
class AutoSaveManager {
    constructor(bookManager) {
        this.bookManager = bookManager;
        this.setupAutoSave();
    }

    setupAutoSave() {
        // 5分ごとに自動保存
        setInterval(() => {
            this.bookManager.saveLibrary();
        }, 5 * 60 * 1000);

        // ページ離脱時の保存
        window.addEventListener('beforeunload', () => {
            this.bookManager.saveLibrary();
        });
    }
}