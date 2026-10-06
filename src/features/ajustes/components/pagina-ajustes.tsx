import { useSearchParams } from 'react-router'
import { useEmpresaActiva } from '@/app/empresa-activa'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AjustesCobros } from '@/features/ajustes/components/ajustes-cobros'
import { AjustesEmpresa } from '@/features/ajustes/components/ajustes-empresa'
import { AjustesUsuarios } from '@/features/ajustes/components/ajustes-usuarios'

const PESTANAS = ['empresa', 'usuarios', 'cobros'] as const
type Pestana = (typeof PESTANAS)[number]

export function PaginaAjustes() {
  const { empresa } = useEmpresaActiva()
  const [params, setParams] = useSearchParams()
  const actual: Pestana = PESTANAS.includes(params.get('seccion') as Pestana) ? (params.get('seccion') as Pestana) : 'empresa'

  if (!empresa) return null

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Ajustes</h1>
      <Tabs value={actual} onValueChange={(v) => setParams({ seccion: v }, { replace: true })}>
        <TabsList className="mb-6">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="cobros">Cobros en línea</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa">
          <AjustesEmpresa key={empresa.id} empresaId={empresa.id} />
        </TabsContent>
        <TabsContent value="usuarios">
          <AjustesUsuarios key={empresa.id} empresaId={empresa.id} />
        </TabsContent>
        <TabsContent value="cobros">
          <AjustesCobros key={empresa.id} empresaId={empresa.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
