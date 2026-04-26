import ReactDOM from 'react-dom';

export function ModalPortal({ children }: { children: React.ReactNode }) {
  return ReactDOM.createPortal(children, document.body);
}
