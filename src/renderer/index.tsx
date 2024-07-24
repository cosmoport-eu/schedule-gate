import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

window.electron.ipcRenderer.sendMessage('config');

window.electron.ipcRenderer.once('config', (config) => {
  console.log({config})
  root.render(<App conf={config} />);
});
