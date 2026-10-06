import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { EmpresaActivaProvider } from '@/app/empresa-activa'
import { TemaProvider } from '@/app/tema'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/auth-provider'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TemaProvider>
        <AuthProvider>
          <EmpresaActivaProvider>
            <TooltipProvider delayDuration={300}>
              {children}
              <Toaster position="top-center" richColors closeButton />
            </TooltipProvider>
          </EmpresaActivaProvider>
        </AuthProvider>
      </TemaProvider>
    </QueryClientProvider>
  )
}
