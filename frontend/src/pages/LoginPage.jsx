import { LogIn } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import TryDemoButton from '../components/TryDemoButton';
import PasswordInput from '../components/auth/PasswordInput';
import { emailError } from '../components/auth/validation';
import { useForm } from '../components/forms/useForm';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const validate = ({ email, password }) => ({
  email: emailError(email),
  password: password ? undefined : 'Password is required',
});

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { user, login } = useAuth();
  const location = useLocation();
  const { field, handleSubmit, submitting, formError } = useForm(
    { email: '', password: '' },
    validate,
  );

  // Once logged in (including right after submitting), continue to the page that asked for login.
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  const onSubmit = handleSubmit(({ email, password }) => login({ email: email.trim(), password }));

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue turning stories into test cases."
      footer={
        <>
          New to TestPilot AI?{' '}
          <Link to="/register" className="font-medium text-accent-fg hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Banner data-testid="auth-error">{formError}</Banner>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          data-testid="login-email"
          data-autofocus
          {...field('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          data-testid="login-password"
          {...field('password')}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          icon={LogIn}
          loading={submitting}
          data-testid="login-submit"
        >
          Log in
        </Button>
      </form>
      <div className="mt-6 flex items-center gap-3 text-xs text-subtle" aria-hidden="true">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <TryDemoButton size="md" className="mt-6 w-full" />
    </AuthLayout>
  );
}
