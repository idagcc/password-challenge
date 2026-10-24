import { createRoot } from 'react-dom/client';
import App from './App';
import { Operator } from './Operator';
import './design/figma.css';
import './styles.css';
import './presentation.css';
createRoot(document.getElementById('root')!).render(location.pathname === '/operator' ? <Operator/> : <App/>);
