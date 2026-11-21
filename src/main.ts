import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

// (Safari zooms the page on its own gesture events, whatever `touch-action` says: a pinch is a view's own, app.css)
document.addEventListener('gesturestart', (e) => e.preventDefault());

export default mount(App, { target: document.getElementById('app')! });
