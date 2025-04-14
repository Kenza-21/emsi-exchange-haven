
import { LoginForm } from '@/components/auth/LoginForm';

const LoginPage = () => {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
        <p className="text-gray-600">Sign in to your EMSI Exchange Hub account</p>
      </div>
      
      <LoginForm />
    </div>
  );
};

export default LoginPage;
