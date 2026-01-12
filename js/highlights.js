// Highlights Management
class HighlightsManager {
    constructor(bookshelf) {
        this.bookshelf = bookshelf;
        this.highlightsCache = new Map();
    }

    async loadHighlightsForBook(book) {
        const cacheKey = book.bookId;

        if (this.highlightsCache.has(cacheKey)) {
            return this.highlightsCache.get(cacheKey);
        }

        try {
            // Use bookId-based lookup from highlights index
            const fileName = await this.getHighlightFileByBookId(book.bookId);

            if (fileName) {
                // ASCIIファイル名フォルダから読み込み（GitHub Pages対応）
                const response = await fetch(`data/HighlightsASCII/${fileName}`);
                if (response.ok) {
                    const markdownText = await response.text();
                    const highlights = this.parseMarkdownHighlights(markdownText);
                    this.highlightsCache.set(cacheKey, highlights);
                    return highlights;
                }
            }

            // No highlights found
            this.highlightsCache.set(cacheKey, []);
            return [];

        } catch (error) {
            console.error('ハイライト読み込みエラー:', error);
            this.highlightsCache.set(cacheKey, []);
            return [];
        }
    }


    async getHighlightFileByBookId(bookId) {
        try {
            const response = await fetch(`data/highlights-index.json?t=${Date.now()}`);
            if (response.ok) {
                const index = await response.json();
                return index[bookId] || null;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    extractBookIdFromMarkdown(markdownText) {
        // Extract bookId (ASIN) from YAML frontmatter
        const yamlMatch = markdownText.match(/---\s*\n([\s\S]*?)\n---/);
        if (yamlMatch) {
            const yamlContent = yamlMatch[1];
            // asinフィールドを探す（後方互換性）
            const asinMatch = yamlContent.match(/asin:\s*([A-Z0-9]+)/);
            if (asinMatch) {
                return asinMatch[1];
            }
            // bookIdフィールドも探す
            const bookIdMatch = yamlContent.match(/bookId:\s*([^\s]+)/);
            if (bookIdMatch) {
                return bookIdMatch[1];
            }
        }

        // Also try to extract from markdown content
        const asinInContent = markdownText.match(/ASIN:\s*([A-Z0-9]+)/);
        return asinInContent ? asinInContent[1] : null;
    }

    parseMarkdownHighlights(markdownText) {
        const highlights = [];

        // Find the Highlights section - capture everything after ## Highlights
        const highlightsSectionMatch = markdownText.match(/## Highlights\s*\n([\s\S]*)/);

        if (highlightsSectionMatch) {
            const highlightsContent = highlightsSectionMatch[1];

            // Split by --- separators and find highlight patterns
            const sections = highlightsContent.split(/\n---\n/);

            const highlightMatches = [];
            sections.forEach((section) => {
                const trimmed = section.trim();
                if (trimmed && trimmed.includes('— location:')) {
                    highlightMatches.push(trimmed);
                }
            });

            if (highlightMatches && highlightMatches.length > 0) {
                for (let i = 0; i < highlightMatches.length; i++) {
                    const match = highlightMatches[i];

                    const locationMatch = match.match(/(.+?)\s*—\s*location:\s*\[(\d+)\]/s);
                    if (locationMatch) {
                        const text = locationMatch[1].trim();
                        const location = locationMatch[2];

                        if (text.length > 10) {
                            highlights.push({
                                text: text,
                                location: `Kindle の位置: ${location}`,
                                note: null
                            });
                        }
                    }
                }
            }
        }
        return highlights;
    }

    renderHighlights(highlights, container) {
        if (!highlights || highlights.length === 0) {
            container.textContent = '';
            const noHighlights = document.createElement('p');
            noHighlights.className = 'no-highlights';
            noHighlights.textContent = 'この本にはハイライトがありません';
            container.appendChild(noHighlights);
            return;
        }

        const highlightCount = highlights.length;
        let highlightsHTML = `
            <div class="highlights-header">
                <span class="highlights-count">${highlightCount}個のハイライト</span>
                <button class="btn btn-small toggle-highlights">全て表示</button>
            </div>
        `;

        // Show first 3 highlights by default
        const visibleHighlights = highlights.slice(0, 3);
        const hiddenHighlights = highlights.slice(3);

        highlightsHTML += '<div class="highlights-list visible">';
        visibleHighlights.forEach((highlight, index) => {
            highlightsHTML += `
                <div class="highlight-item" data-index="${index}">
                    <div class="highlight-text">"${this.escapeHtml(highlight.text)}"</div>
                    ${highlight.note ? `<div class="highlight-note">${this.escapeHtml(highlight.note)}</div>` : ''}
                    ${highlight.location ? `<div class="highlight-location">${this.escapeHtml(highlight.location)}</div>` : ''}
                </div>
            `;
        });
        highlightsHTML += '</div>';

        if (hiddenHighlights.length > 0) {
            highlightsHTML += '<div class="highlights-list hidden" style="display: none;">';
            hiddenHighlights.forEach((highlight, index) => {
                highlightsHTML += `
                    <div class="highlight-item" data-index="${index + 3}">
                        <div class="highlight-text">"${this.escapeHtml(highlight.text)}"</div>
                        ${highlight.note ? `<div class="highlight-note">${this.escapeHtml(highlight.note)}</div>` : ''}
                        ${highlight.location ? `<div class="highlight-location">${this.escapeHtml(highlight.location)}</div>` : ''}
                    </div>
                `;
            });
            highlightsHTML += '</div>';
        }

        container.textContent = '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = highlightsHTML;
        while (tempDiv.firstChild) {
            container.appendChild(tempDiv.firstChild);
        }

        // Setup toggle functionality
        const toggleBtn = container.querySelector('.toggle-highlights');
        if (toggleBtn && hiddenHighlights.length > 0) {
            toggleBtn.addEventListener('click', () => {
                const hiddenList = container.querySelector('.highlights-list.hidden');
                const isVisible = hiddenList.style.display !== 'none';

                hiddenList.style.display = isVisible ? 'none' : 'block';
                toggleBtn.textContent = isVisible ? '全て表示' : '一部のみ表示';
            });
        } else if (toggleBtn) {
            toggleBtn.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async searchInHighlights(query) {
        const results = [];

        for (const book of this.bookshelf.books) {
            const highlights = await this.loadHighlightsForBook(book);
            const matchingHighlights = highlights.filter(highlight =>
                highlight.text.toLowerCase().includes(query.toLowerCase()) ||
                (highlight.note && highlight.note.toLowerCase().includes(query.toLowerCase()))
            );

            if (matchingHighlights.length > 0) {
                results.push({
                    book: book,
                    highlights: matchingHighlights
                });
            }
        }

        return results;
    }

    exportHighlights() {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalBooks: this.bookshelf.books.length,
            highlightsData: []
        };

        this.bookshelf.books.forEach(async (book) => {
            const highlights = await this.loadHighlightsForBook(book);
            if (highlights.length > 0) {
                exportData.highlightsData.push({
                    book: {
                        title: book.title,
                        authors: book.authors,
                        bookId: book.bookId
                    },
                    highlightCount: highlights.length,
                    highlights: highlights
                });
            }
        });

        setTimeout(() => {
            this.downloadJSON(exportData, 'virtual-bookshelf-highlights.json');
        }, 1000); // Wait for async operations
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getHighlightStats() {
        return {
            totalHighlights: Array.from(this.highlightsCache.values())
                .reduce((sum, highlights) => sum + highlights.length, 0),
            booksWithHighlights: Array.from(this.highlightsCache.values())
                .filter(highlights => highlights.length > 0).length,
            averageHighlightsPerBook: this.highlightsCache.size > 0 ?
                Array.from(this.highlightsCache.values())
                    .reduce((sum, highlights) => sum + highlights.length, 0) / this.highlightsCache.size : 0
        };
    }
}

// HighlightsManager is now initialized directly in bookshelf.js after bookshelf is ready
