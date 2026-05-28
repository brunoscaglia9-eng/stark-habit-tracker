-- ══════════════════════════════════════════════════════
-- SCHEMA DE BASE DE DATOS PARA STARK-HABIT-TRACKER
-- Ejecuta este script en el editor SQL de Supabase (SQL Editor > New Query)
-- ══════════════════════════════════════════════════════

-- 1. Tabla de Hábitos
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, id)
);

-- Habilitar Row Level Security (RLS) en la tabla habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para habits
CREATE POLICY "Usuarios pueden ver sus propios hábitos" 
    ON public.habits FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios hábitos" 
    ON public.habits FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios hábitos" 
    ON public.habits FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios hábitos" 
    ON public.habits FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Tabla de Completados (Historial de hábitos)
CREATE TABLE IF NOT EXISTS public.completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id TEXT NOT NULL,
    date_key TEXT NOT NULL, -- Formato: YYYY-MM-DD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, habit_id, date_key)
);

-- Habilitar RLS en la tabla completions
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para completions
CREATE POLICY "Usuarios pueden ver sus propios completados" 
    ON public.completions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios completados" 
    ON public.completions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios completados" 
    ON public.completions FOR DELETE 
    USING (auth.uid() = user_id);
