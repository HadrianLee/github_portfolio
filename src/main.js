import './style.css'
import { GithubRepoViewer } from './GithubRepoViewer.js';

const USERNAMES = ['HadrianLee', 'chhl1g24'];
const CONTAINER_ID = 'repo-container';

async function init() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    container.textContent = '';
    container.appendChild(createPageHeader());
    container.appendChild(createLoadingState());

    const content = document.createElement('main');
    content.className = 'portfolio-grid';

    const renderedProfiles = await Promise.all(USERNAMES.map(renderProfile));
    content.append(...renderedProfiles.filter(Boolean));

    container.querySelector('.loading-state')?.remove();
    container.appendChild(content);
}

async function renderProfile(username) {
    const viewer = new GithubRepoViewer(username);
    const sections = await viewer.generateRepoListItems();

    if (sections.length === 0) return null;

    const profile = document.createElement('article');
    profile.className = 'profile-panel';

    const header = document.createElement('header');
    header.className = 'profile-header';

    const avatar = document.createElement('img');
    avatar.className = 'profile-avatar';
    avatar.src = `https://github.com/${username}.png?size=96`;
    avatar.alt = `${username} GitHub avatar`;
    avatar.loading = 'lazy';

    const headingGroup = document.createElement('div');

    const title = document.createElement('h2');
    title.className = 'repo-user-heading';
    title.textContent = username;

    const link = document.createElement('a');
    link.className = 'profile-link';
    link.href = `https://github.com/${username}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `@${username}`;

    headingGroup.appendChild(title);
    headingGroup.appendChild(link);
    header.appendChild(avatar);
    header.appendChild(headingGroup);
    profile.appendChild(header);
    sections.forEach(section => profile.appendChild(section));

    return profile;
}

function createPageHeader() {
    const header = document.createElement('header');
    header.className = 'page-header';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'GitHub portfolio';

    const title = document.createElement('h1');
    title.textContent = 'Repository work and public contributions';

    const intro = document.createElement('p');
    intro.className = 'page-intro';
    intro.textContent = 'Recent repositories, pull request contributions, and language breakdowns pulled from the GitHub API.';

    header.appendChild(eyebrow);
    header.appendChild(title);
    header.appendChild(intro);

    return header;
}

function createLoadingState() {
    const loading = document.createElement('div');
    loading.className = 'loading-state';

    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = 'Loading GitHub activity...';

    loading.appendChild(spinner);
    loading.appendChild(text);
    return loading;
}

document.addEventListener('DOMContentLoaded', init);
