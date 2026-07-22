import { UserRound, X } from 'lucide-react';

export interface AccountPromptModalProps {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
}

/** Generic "account state" popup - used both for "bu numara kayıtlı değil, kayıt olun" and "bu numara zaten kayıtlı, giriş yapın" prompts on the login screen. */
export function AccountPromptModal({ title, message, actionLabel, onAction, onClose }: AccountPromptModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="account-prompt-title" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>

        <div className="modal-icon">
          <UserRound size={26} strokeWidth={2} />
        </div>
        <h2 id="account-prompt-title" className="modal-title">
          {title}
        </h2>
        <p className="modal-subtitle">{message}</p>

        <button className="btn btn-login-primary" type="button" onClick={onAction} style={{ width: '100%' }}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
