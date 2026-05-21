const LANGUAGE_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Python: '#3572A5',
    Java: '#b07219',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    Shell: '#89e051',
    Vue: '#41b883',
    Svelte: '#ff3e00'
};

export class GithubRepoViewer {
    apiHeaders = {
        'X-GitHub-Api-Version': '2026-03-10',
        'Accept': 'application/vnd.github+json'
    };

    /**
     * @param {string} username - The GitHub username to fetch.
     */
    constructor(username) {
        this.username = username;
    }

    /**
     * Fetches owned and contributed repositories and returns secure section elements.
     * @returns {Promise<HTMLElement[]>} Array of repository section elements.
     */
    async generateRepoListItems() {
        try {
            const ownedRepos = await this.#withLanguageStats(await this.#fetchOwnedRepos());
            const contributedRepos = await this.#withLanguageStats(
                await this.#fetchContributedRepos(ownedRepos)
            );
            const sections = [];

            if (ownedRepos.length > 0) {
                sections.push(this.#createRepoSectionDOMElement('Owned repositories', ownedRepos));
            }

            if (contributedRepos.length > 0) {
                sections.push(
                    this.#createRepoSectionDOMElement('Contributed repositories', contributedRepos, 'Contributed')
                );
            }

            return sections;
        } catch (error) {
            console.error(`Error fetching repos for ${this.username}:`, error);
            return [this.#createErrorDOMElement()];
        }
    }

    async #fetchOwnedRepos() {
        return this.#fetchGithubJson(
            `https://api.github.com/users/${this.username}/repos?sort=updated&per_page=8`
        );
    }

    async #fetchContributedRepos(ownedRepos) {
        try {
            const query = new URLSearchParams({
                q: `type:pr author:${this.username}`,
                sort: 'updated',
                order: 'desc',
                per_page: '20'
            });
            const pullRequests = await this.#fetchGithubJson(
                `https://api.github.com/search/issues?${query.toString()}`
            );
            const ownedRepoNames = new Set(ownedRepos.map(repo => repo.full_name.toLowerCase()));
            const contributedRepoUrls = [...new Set(
                pullRequests.items
                    .map(item => item.repository_url)
                    .filter(repoUrl => repoUrl && !ownedRepoNames.has(this.#repoFullNameFromApiUrl(repoUrl)))
            )].slice(0, 5);

            return Promise.all(contributedRepoUrls.map(repoUrl => this.#fetchGithubJson(repoUrl)));
        } catch (error) {
            console.error(`Error fetching contributed repos for ${this.username}:`, error);
            return [];
        }
    }

    async #withLanguageStats(repos) {
        const enrichedRepos = await Promise.all(
            repos.map(async (repo) => ({
                ...repo,
                languages: await this.#fetchLanguageStats(repo.languages_url)
            }))
        );

        return enrichedRepos;
    }

    async #fetchLanguageStats(languagesUrl) {
        try {
            const languages = await this.#fetchGithubJson(languagesUrl);
            const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);

            if (totalBytes === 0) return [];

            return Object.entries(languages)
                .map(([name, bytes]) => ({
                    name,
                    percentage: Math.round((bytes / totalBytes) * 1000) / 10,
                    color: LANGUAGE_COLORS[name] || '#8b949e'
                }))
                .sort((a, b) => b.percentage - a.percentage);
        } catch (error) {
            console.error(`Error fetching languages for ${this.username}:`, error);
            return [];
        }
    }

    async #fetchGithubJson(url) {
        const response = await fetch(url, {
            method: 'GET',
            headers: this.apiHeaders
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return response.json();
    }

    #repoFullNameFromApiUrl(repoUrl) {
        return repoUrl.replace('https://api.github.com/repos/', '').toLowerCase();
    }

    #createRepoSectionDOMElement(titleText, repos, labelText = '') {
        const section = document.createElement('section');
        section.className = 'repo-section';

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'repo-section-header';

        const title = document.createElement('h3');
        title.textContent = titleText;

        const count = document.createElement('span');
        count.className = 'repo-count';
        count.textContent = `${repos.length}`;

        const list = document.createElement('ul');
        list.className = 'github-repo-list';
        repos.forEach(repo => list.appendChild(this.#createRepoDOMElement(repo, labelText)));

        sectionHeader.appendChild(title);
        sectionHeader.appendChild(count);
        section.appendChild(sectionHeader);
        section.appendChild(list);

        return section;
    }

    /**
     * Securely builds the DOM structure for a single repository (Private helper).
     */
    #createRepoDOMElement(repo, labelText = '') {
        const listItem = document.createElement('li');
        listItem.className = 'github-repo-item';
        listItem.classList.add(`user-${this.username.toLowerCase()}`);

        const title = document.createElement('h4');
        title.className = 'repo-title';
        const link = document.createElement('a');
        link.href = repo.html_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = repo.name;
        title.appendChild(link);

        const description = document.createElement('p');
        description.className = 'repo-description';
        description.textContent = repo.description || 'No description provided.';

        const meta = document.createElement('div');
        meta.className = 'repo-meta';

        const language = document.createElement('span');
        language.className = 'repo-language';
        language.textContent = repo.language || 'Mixed';

        const stars = document.createElement('span');
        stars.className = 'repo-stars';
        stars.textContent = `\u2B50 ${repo.stargazers_count}`;

        meta.appendChild(language);
        meta.appendChild(stars);

        if (labelText) {
            const label = document.createElement('span');
            label.className = 'repo-label';
            label.textContent = labelText;
            meta.appendChild(label);
        }

        listItem.appendChild(title);
        listItem.appendChild(description);
        listItem.appendChild(this.#createLanguageDOMElement(repo.languages));
        listItem.appendChild(meta);

        return listItem;
    }

    #createLanguageDOMElement(languages) {
        const wrapper = document.createElement('div');
        wrapper.className = 'repo-language-breakdown';

        if (languages.length === 0) {
            return wrapper;
        }

        const bar = document.createElement('div');
        bar.className = 'language-bar';

        const details = document.createElement('div');
        details.className = 'language-details';

        languages.forEach(language => {
            const segment = document.createElement('span');
            segment.className = 'language-segment';
            segment.style.backgroundColor = language.color;
            segment.style.width = `${language.percentage}%`;
            segment.title = `${language.name} ${language.percentage}%`;
            bar.appendChild(segment);

            const item = document.createElement('span');
            item.className = 'language-detail';

            const dot = document.createElement('span');
            dot.className = 'language-dot';
            dot.style.backgroundColor = language.color;

            const text = document.createElement('span');
            text.textContent = `${language.name} ${language.percentage}%`;

            item.appendChild(dot);
            item.appendChild(text);
            details.appendChild(item);
        });

        wrapper.appendChild(bar);
        wrapper.appendChild(details);

        return wrapper;
    }

    /**
     * Securely builds an error item if the fetch fails (Private helper).
     */
    #createErrorDOMElement() {
        const errorItem = document.createElement('div');
        errorItem.className = 'github-repo-error-item';

        const errorText = document.createElement('p');
        errorText.className = 'repo-error';
        errorText.textContent = `Failed to load repositories for @${this.username}.`;

        errorItem.appendChild(errorText);
        return errorItem;
    }
}
