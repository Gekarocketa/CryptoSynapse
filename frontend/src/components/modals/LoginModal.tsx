import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal, Input, Button } from '../ui';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister,
  onLogin,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setEmail('');
        setPassword('');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('logInToApp')}
      subtitle={t('authenticateAbove')}
      maxWidth="sm"
    >
      {error && (
        <div className="p-3 text-xs rounded bg-down/10 border border-down/20 text-down flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 text-xs rounded bg-up/10 border border-up/20 text-up flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Authorized!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label={t('emailAddress')}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <Input
          label={t('password')}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          loading={loading}
        >
          {t('logIn')}
        </Button>
      </form>

      <div className="text-center pt-3 border-t border-border text-xs text-muted">
        <span>{t('dontHaveAccount')} </span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-accent hover:underline font-medium cursor-pointer"
        >
          {t('createAccount')}
        </button>
      </div>
    </Modal>
  );
};
