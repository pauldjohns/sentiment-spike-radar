
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add user_id columns to existing tables (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticker_sentiment' AND column_name = 'user_id') THEN
    ALTER TABLE public.ticker_sentiment ADD COLUMN user_id UUID REFERENCES public.profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sentiment_alerts' AND column_name = 'user_id') THEN
    ALTER TABLE public.sentiment_alerts ADD COLUMN user_id UUID REFERENCES public.profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_price_tracking' AND column_name = 'user_id') THEN
    ALTER TABLE public.stock_price_tracking ADD COLUMN user_id UUID REFERENCES public.profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accuracy_metrics' AND column_name = 'user_id') THEN
    ALTER TABLE public.accuracy_metrics ADD COLUMN user_id UUID REFERENCES public.profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stocktwits_messages' AND column_name = 'owner_id') THEN
    ALTER TABLE public.stocktwits_messages ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- Update user_alert_configs to reference profiles instead of auth.users
ALTER TABLE public.user_alert_configs DROP CONSTRAINT IF EXISTS user_alert_configs_user_id_fkey;
ALTER TABLE public.user_alert_configs ADD CONSTRAINT user_alert_configs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update user_watchlists to reference profiles instead of auth.users  
ALTER TABLE public.user_watchlists DROP CONSTRAINT IF EXISTS user_watchlists_user_id_fkey;
ALTER TABLE public.user_watchlists ADD CONSTRAINT user_watchlists_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable RLS on all tables that now have user_id
ALTER TABLE public.ticker_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_price_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accuracy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktwits_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ticker_sentiment
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticker_sentiment' AND policyname = 'Users can view their own ticker sentiment') THEN
    EXECUTE 'CREATE POLICY "Users can view their own ticker sentiment" ON public.ticker_sentiment FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticker_sentiment' AND policyname = 'Users can insert their own ticker sentiment') THEN
    EXECUTE 'CREATE POLICY "Users can insert their own ticker sentiment" ON public.ticker_sentiment FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ticker_sentiment' AND policyname = 'Users can update their own ticker sentiment') THEN
    EXECUTE 'CREATE POLICY "Users can update their own ticker sentiment" ON public.ticker_sentiment FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Create RLS policies for sentiment_alerts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentiment_alerts' AND policyname = 'Users can view their own alerts') THEN
    EXECUTE 'CREATE POLICY "Users can view their own alerts" ON public.sentiment_alerts FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentiment_alerts' AND policyname = 'Users can insert their own alerts') THEN
    EXECUTE 'CREATE POLICY "Users can insert their own alerts" ON public.sentiment_alerts FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sentiment_alerts' AND policyname = 'Users can update their own alerts') THEN
    EXECUTE 'CREATE POLICY "Users can update their own alerts" ON public.sentiment_alerts FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Create RLS policies for stock_price_tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_price_tracking' AND policyname = 'Users can view their own price tracking') THEN
    EXECUTE 'CREATE POLICY "Users can view their own price tracking" ON public.stock_price_tracking FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_price_tracking' AND policyname = 'Users can insert their own price tracking') THEN
    EXECUTE 'CREATE POLICY "Users can insert their own price tracking" ON public.stock_price_tracking FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_price_tracking' AND policyname = 'Users can update their own price tracking') THEN
    EXECUTE 'CREATE POLICY "Users can update their own price tracking" ON public.stock_price_tracking FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Create RLS policies for accuracy_metrics
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accuracy_metrics' AND policyname = 'Users can view their own accuracy metrics') THEN
    EXECUTE 'CREATE POLICY "Users can view their own accuracy metrics" ON public.accuracy_metrics FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accuracy_metrics' AND policyname = 'Users can insert their own accuracy metrics') THEN
    EXECUTE 'CREATE POLICY "Users can insert their own accuracy metrics" ON public.accuracy_metrics FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accuracy_metrics' AND policyname = 'Users can update their own accuracy metrics') THEN
    EXECUTE 'CREATE POLICY "Users can update their own accuracy metrics" ON public.accuracy_metrics FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Create RLS policies for stocktwits_messages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stocktwits_messages' AND policyname = 'Users can view their own messages') THEN
    EXECUTE 'CREATE POLICY "Users can view their own messages" ON public.stocktwits_messages FOR SELECT USING (auth.uid() = owner_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stocktwits_messages' AND policyname = 'Users can insert their own messages') THEN
    EXECUTE 'CREATE POLICY "Users can insert their own messages" ON public.stocktwits_messages FOR INSERT WITH CHECK (auth.uid() = owner_id)';
  END IF;
END $$;
