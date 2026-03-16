// globalSearch.js

(function () {
    let searchTimeout;

    function initGlobalSearch() {
        const searchInput = document.getElementById('globalSearchInput');
        const resultsOverlay = document.getElementById('globalSearchResults');

        if (!searchInput || !resultsOverlay) return;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                resultsOverlay.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const data = await apiFetch(`/api/messages/search-global?q=${encodeURIComponent(query)}`);
                    renderGlobalResults(data, resultsOverlay);
                } catch (err) {
                    console.error('[search] Global search failed:', err);
                }
            }, 300);
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsOverlay.contains(e.target)) {
                resultsOverlay.style.display = 'none';
            }
        });
    }

    function renderGlobalResults(data, container) {
        const { users, groups, messages } = data;
        let html = '';

        if (!users.length && !groups.length && !messages.length) {
            html = '<div class="p-3 text-center text-muted small">No results matching your query</div>';
        } else {
            // Users Section
            if (users.length) {
                html += '<div class="search-category-header" style="background: #f8f9fa; padding: 8px 15px; font-size: 0.75rem; font-weight: 700; color: #7b8a9b; text-transform: uppercase;">People</div>';
                users.forEach(u => {
                    html += `
                        <div class="search-result-item" onclick="startGlobalChat('${u._id}')" style="padding: 10px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; overflow: hidden;">
                                ${u.profilePic || u.profilePicture ? `<img src="${u.profilePic || u.profilePicture}" style="width:100%; height:100%; object-fit:cover;">` : u.name.charAt(0)}
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; font-weight: 600; color: #1a1a1a;">${u.name}</div>
                                <div style="font-size: 0.75rem; color: #7b8a9b;">${u.title || u.role}</div>
                            </div>
                        </div>
                    `;
                });
            }

            // Groups Section
            if (groups.length) {
                html += '<div class="search-category-header" style="background: #f8f9fa; padding: 8px 15px; font-size: 0.75rem; font-weight: 700; color: #7b8a9b; text-transform: uppercase;">Groups</div>';
                groups.forEach(g => {
                    html += `
                        <div class="search-result-item" onclick="goToConversation('${g._id}')" style="padding: 10px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(194, 73, 31, 0.1); color: var(--ember); display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
                                <i class="fas fa-users"></i>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; font-weight: 600; color: #1a1a1a;">${g.metadata?.name || 'Unnamed Group'}</div>
                                <div style="font-size: 0.75rem; color: #7b8a9b;">${g.participants?.length || 0} members</div>
                            </div>
                        </div>
                    `;
                });
            }

            // Messages Section
            if (messages.length) {
                html += '<div class="search-category-header" style="background: #f8f9fa; padding: 8px 15px; font-size: 0.75rem; font-weight: 700; color: #7b8a9b; text-transform: uppercase;">Messages</div>';
                messages.forEach(m => {
                    html += `
                        <div class="search-result-item" onclick="goToConversation('${m.conversationId}')" style="padding: 10px 15px; cursor: pointer; transition: background 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 0.85rem; font-weight: 600;">${m.sender?.name || 'User'}</span>
                                <span style="font-size: 0.7rem; color: #7b8a9b;">${new Date(m.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div style="font-size: 0.8rem; color: #52606d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.text}</div>
                        </div>
                    `;
                });
            }
        }

        container.innerHTML = html;
        container.style.display = 'block';

        // Add hover effects
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.style.background = '#f1f3f5');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        });
    }

    // Navigation and Action Helpers
    window.startGlobalChat = function (userId) {
        window.location.href = `Messages.html?userId=${userId}`;
    }

    window.goToConversation = function (conversationId) {
        window.location.href = `Messages.html?conversationId=${conversationId}`;
    }

    // Initialize when DOM is ready or navbar is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlobalSearch);
    } else {
        initGlobalSearch();
    }

    // Expose for manual re-init if needed
    window.initGlobalSearch = initGlobalSearch;

})();
