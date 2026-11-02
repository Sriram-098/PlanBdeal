import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { registerFormSchema, RegisterFormInput } from '../utils/authSchema';

export function Register() {
  const { register: registerUser } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({ resolver: zodResolver(registerFormSchema) });

  const onSubmit = async (data: RegisterFormInput) => {
    try {
      await registerUser(data.fullName, data.email, data.password, data.confirmPassword);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      show((err as Error).message, 'error');
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-8">
      <Card className="w-full p-6">
        <h1 className="mb-6 text-2xl font-bold text-white">Create your account</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full name" {...register('fullName')} error={errors.fullName?.message} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Input label="Confirm password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Register
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-cine-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-cine-accent hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
