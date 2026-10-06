import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { TemaProvider } from '@/app/tema'
import { TooltipProvider } from '@/components/ui/tooltip'

// En la Fase 1 se agregan AuthProvider y EmpresaActivaProvider aquí.
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
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </TemaProvider>
    </QueryClientProvider>
  )
}
