
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, studentId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, studentId: string) => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description: "Please connect to Supabase using the green button in the top right corner.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) throw error;
      
      if (data.user) {
        // Create a profile for the user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: data.user.id,
            full_name: fullName,
            student_id: studentId
          }]);
          
        if (profileError) {
          await supabase.auth.signOut();
          throw profileError;
        }
        
        toast({
          title: "Account created",
          description: "Your account has been created successfully. Please check your email for verification."
        });
      }
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description: "Please connect to Supabase using the green button in the top right corner.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in."
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;

    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
