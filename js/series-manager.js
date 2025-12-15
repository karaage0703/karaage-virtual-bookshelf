// Series Manager - 漫画シリーズ検出・グループ化
// Virtual Bookshelfの漫画シリーズをまとめて表示するためのロジック

/**
 * @typedef {Object} SeriesInfo
 * @property {string} seriesId - シリーズ識別子
 * @property {string} seriesName - シリーズ名（巻数除去後）
 * @property {string} authors - 著者名
 * @property {Array<{book: Object, volumeNumber: number|null}>} volumes - 巻情報リスト
 * @property {Object} representativeBook - 代表本（1巻または最新巻）
 * @property {number} totalVolumes - 総巻数
 */

/**
 * @typedef {Object} SeriesProgress
 * @property {number} total - 総巻数
 * @property {number} read - 読了巻数
 * @property {number} unread - 未読巻数
 */

class SeriesManager {
    constructor() {
        // キャッシュ
        this.seriesGroups = [];
        this.bookToSeriesMap = new Map();
        this.cacheValid = false;
    }

    /**
     * 蔵書からシリーズを検出・グループ化
     * @param {Object[]} books - 蔵書リスト
     * @returns {{seriesGroups: SeriesInfo[], bookToSeriesMap: Map<string, string>}}
     */
    detectAndGroupSeries(books) {
        if (this.cacheValid && this.seriesGroups.length > 0) {
            return {
                seriesGroups: this.seriesGroups,
                bookToSeriesMap: this.bookToSeriesMap
            };
        }

        // シリーズ候補をグループ化
        const seriesMap = new Map(); // seriesId -> volumes[]

        books.forEach(book => {
            if (!book.title || !book.authors) {
                return; // タイトルや著者がない場合はスキップ
            }

            const { volumeNumber, normalizedTitle } = this.extractVolumeNumber(book.title);

            // 巻数が検出できない場合はシリーズ候補にしない
            if (volumeNumber === null) {
                return;
            }

            const seriesId = this.generateSeriesId(normalizedTitle, book.authors);

            if (!seriesMap.has(seriesId)) {
                seriesMap.set(seriesId, {
                    seriesId,
                    seriesName: normalizedTitle,
                    authors: book.authors,
                    volumes: []
                });
            }

            seriesMap.get(seriesId).volumes.push({
                book,
                volumeNumber
            });
        });

        // 2冊以上のものだけをシリーズとして扱う
        this.seriesGroups = [];
        this.bookToSeriesMap = new Map();

        seriesMap.forEach((seriesData, seriesId) => {
            if (seriesData.volumes.length >= 2) {
                // 巻数順にソート
                seriesData.volumes.sort((a, b) => {
                    if (a.volumeNumber === null) return 1;
                    if (b.volumeNumber === null) return -1;
                    return a.volumeNumber - b.volumeNumber;
                });

                // 代表本を設定（1巻があれば1巻、なければ最初の巻）
                const representativeBook = seriesData.volumes[0].book;

                const seriesInfo = {
                    seriesId,
                    seriesName: seriesData.seriesName,
                    authors: seriesData.authors,
                    volumes: seriesData.volumes,
                    representativeBook,
                    totalVolumes: seriesData.volumes.length
                };

                this.seriesGroups.push(seriesInfo);

                // 各本からシリーズへのマッピングを作成
                seriesData.volumes.forEach(({ book }) => {
                    this.bookToSeriesMap.set(book.asin, seriesId);
                });
            }
        });

        this.cacheValid = true;

        return {
            seriesGroups: this.seriesGroups,
            bookToSeriesMap: this.bookToSeriesMap
        };
    }

    /**
     * 文字列を包括的に正規化（全角→半角、記号統一など）
     * @param {string} str - 正規化対象文字列
     * @returns {string}
     */
    normalizeString(str) {
        if (!str) return '';

        return str
            // 全角英数字を半角に
            .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            })
            // 全角括弧を半角に
            .replace(/（/g, '(')
            .replace(/）/g, ')')
            .replace(/【/g, '[')
            .replace(/】/g, ']')
            .replace(/「/g, '[')
            .replace(/」/g, ']')
            // 全角スペースを半角に
            .replace(/　/g, ' ')
            // 全角コロン・セミコロンを半角に
            .replace(/：/g, ':')
            .replace(/；/g, ';')
            // 各種ダッシュ・ハイフンを統一
            .replace(/[－―─ー−]/g, '-')
            // 各種チルダを統一
            .replace(/[～〜]/g, '~')
            // 全角記号を半角に
            .replace(/！/g, '!')
            .replace(/？/g, '?')
            .replace(/＆/g, '&')
            .replace(/＊/g, '*')
            .replace(/＋/g, '+')
            .replace(/，/g, ',')
            .replace(/．/g, '.')
            // 連続スペースを単一に
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * タイトルから巻数を抽出
     * @param {string} title - 本のタイトル
     * @returns {{volumeNumber: number|null, normalizedTitle: string}}
     */
    extractVolumeNumber(title) {
        if (!title) {
            return { volumeNumber: null, normalizedTitle: '' };
        }

        // 包括的に正規化（全角→半角など）
        let normalizedTitle = this.normalizeString(title);

        // 巻数パターン（優先度順、正規化後なので半角のみで対応）
        const patterns = [
            // 「第〇巻」「〇巻」パターン
            /^(.+?)\s*\(?第?(\d+)巻\)?\s*$/,
            /^(.+?)\s+第?(\d+)巻\s*.*$/,
            /^(.+?)\s*第(\d+)巻\s*$/,
            // 「第〇話」パターン（話数範囲も対応）
            /^(.+?)\s+第(\d+)話.+$/,
            // 「Vol.〇」「VOL〇」パターン
            /^(.+?)\s*\(?Vol\.?\s*(\d+)\)?\s*$/i,
            // 「分冊版〇」パターン
            /^(.+?)\s+分冊版(\d+)\s*$/,
            // コロン区切りパターン「タイトル : 27 [...]」
            /^(.+?)\s*:\s*(\d+)\s+.+$/,
            // 括弧付き数字の後にレーベルがある場合「タイトル(1) (レーベル)」
            /^(.+?)\((\d+)\)\s+\(.+\)\s*$/,
            // 括弧付き数字の後に副題がある場合「タイトル(11) 副題」
            /^(.+?)\((\d+)\)\s+.+$/,
            // 括弧付き数字の直後に副題がある場合（スペースなし）「タイトル(8)副題」
            /^(.+?)\((\d+)\)\S.+$/,
            // タイトル直後の数字＋スペース＋副題＋レーベル「大長編ドラえもん8 副題 (レーベル)」
            /^(.+?[^\d\s])(\d+)\s+.+\s*\(.+\)\s*$/,
            // 末尾の数字（括弧あり）「タイトル(1)」
            /^(.+?)\s*\((\d+)\)\s*$/,
            // 数字の後に括弧付き副題がある場合「タイトル 17 (副題)」
            /^(.+?)\s+(\d+)\s*\(.+\)\s*$/,
            // 末尾の数字（スペース区切り）「タイトル 1」
            /^(.+?)\s+(\d+)\s*$/,
            // 括弧の直後に数字「タイトル(副題)2」
            /^(.+?\))(\d+)$/,
            // 「上」「中」「下」パターン
            /^(.+?)\s*\(?(上|中|下)\)?\s*$/,
            // 漢数字＋「ノ巻」「の巻」パターン「タイトル 一ノ巻」
            /^(.+?)\s+(一|二|三|四|五|六|七|八|九|十)[ノの]巻\s*$/,
        ];

        // 特殊パターン: 先頭に「番外編〇巻」がある場合
        const prefixVolumeMatch = normalizedTitle.match(/^番外編(\d+)巻\s+(.+)$/);
        if (prefixVolumeMatch) {
            return {
                volumeNumber: parseInt(prefixVolumeMatch[1], 10),
                normalizedTitle: prefixVolumeMatch[2].trim()
            };
        }

        // 特殊パターン: 先頭に巻数範囲がある場合「22~24 タイトル」
        const prefixRangeMatch = normalizedTitle.match(/^(\d+)[~\-]\d+\s+(.+)$/);
        if (prefixRangeMatch) {
            return {
                volumeNumber: parseInt(prefixRangeMatch[1], 10),
                normalizedTitle: prefixRangeMatch[2].trim()
            };
        }

        for (const pattern of patterns) {
            const match = normalizedTitle.match(pattern);
            if (match) {
                let volumeNumber;
                const volumeStr = match[2];

                // 「上」「中」「下」および漢数字を数字に変換
                const kanjiToNumber = {
                    '上': 1, '中': 2, '下': 3,
                    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
                    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
                };
                if (kanjiToNumber[volumeStr] !== undefined) {
                    volumeNumber = kanjiToNumber[volumeStr];
                } else {
                    volumeNumber = parseInt(volumeStr, 10);
                }

                // 正規化タイトル（巻数部分を除去してトリム）
                let cleanTitle = match[1].trim();
                // 末尾の句読点やスペース、記号を除去
                cleanTitle = cleanTitle.replace(/[\s:;\-~]+$/, '').trim();

                return {
                    volumeNumber,
                    normalizedTitle: cleanTitle
                };
            }
        }

        // パターンにマッチしない場合
        return {
            volumeNumber: null,
            normalizedTitle: normalizedTitle.trim()
        };
    }

    /**
     * シリーズIDを生成（タイトルのみで判定、著者は含めない）
     * @param {string} normalizedTitle - 正規化タイトル
     * @param {string} authors - 著者名（互換性のため残すが使用しない）
     * @returns {string} シリーズID
     */
    generateSeriesId(normalizedTitle, authors) {
        // タイトルのみで判定（著者表記の揺れに対応）
        const normalizedTitleForId = this.normalizeForId(normalizedTitle);
        return normalizedTitleForId;
    }

    /**
     * ID生成用に文字列を正規化（より厳密な正規化）
     * @param {string} str - 正規化対象文字列
     * @returns {string}
     */
    normalizeForId(str) {
        if (!str) return '';

        // まず包括的正規化を適用
        let normalized = this.normalizeString(str);

        return normalized
            .toLowerCase()
            // スペース・記号を除去（ID比較用）
            .replace(/[\s\-:;·・、。,.!?'"()[\]<>]/g, '')
            .trim();
    }

    /**
     * シリーズの読書進捗を取得
     * @param {SeriesInfo} series - シリーズ情報
     * @returns {SeriesProgress}
     */
    getSeriesProgress(series) {
        if (!series || !series.volumes) {
            return { total: 0, read: 0, unread: 0 };
        }

        const total = series.volumes.length;
        let read = 0;

        series.volumes.forEach(({ book }) => {
            // readStatusが 'read' または 'Read' の場合を読了とみなす
            if (book.readStatus && book.readStatus.toLowerCase() === 'read') {
                read++;
            }
        });

        return {
            total,
            read,
            unread: total - read
        };
    }

    /**
     * シリーズIDからシリーズ情報を取得
     * @param {string} seriesId - シリーズID
     * @returns {SeriesInfo|null}
     */
    getSeriesById(seriesId) {
        return this.seriesGroups.find(s => s.seriesId === seriesId) || null;
    }

    /**
     * 本のASINからシリーズ情報を取得
     * @param {string} asin - 本のASIN
     * @returns {SeriesInfo|null}
     */
    getSeriesByBookAsin(asin) {
        const seriesId = this.bookToSeriesMap.get(asin);
        if (!seriesId) return null;
        return this.getSeriesById(seriesId);
    }

    /**
     * キャッシュをクリア（本の追加/削除時）
     */
    clearCache() {
        this.seriesGroups = [];
        this.bookToSeriesMap = new Map();
        this.cacheValid = false;
    }
}

// グローバルに公開
window.SeriesManager = SeriesManager;
