import { useMutation } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEmpresaActiva, usePuedeEditar } from '@/app/empresa-activa'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  actualizarEtapa,
  borrarCategoria,
  crearCategoria,
  crearEtapa,
  reordenar,
  renombrarCategoria,
  type Categoria,
  type Etapa,
} from '@/features/catalogo/api'
import { DialogoNombre } from '@/features/catalogo/components/editar-nombre'
import { ListaOrdenable } from '@/features/catalogo/components/lista-ordenable'
import { useCategorias, useEtapas, useModelos, useRefrescarCatalogo } from '@/features/catalogo/hooks'
import { mensajeError } from '@/lib/errores'

type Dialogo =
  | { tipo: 'nueva-categoria' }
  | { tipo: 'renombrar-categoria'; item: Categoria }
  | { tipo: 'nueva-etapa' }
  | { tipo: 'renombrar-etapa'; item: Etapa }
  | null

export function SeccionCategoriasEtapas() {
  const { empresa } = useEmpresaActiva()
  const editar = usePuedeEditar('editar_catalogo')
  const refrescar = useRefrescarCatalogo()
  const categorias = useCategorias()
  const etapas = useEtapas()
  const modelos = useModelos()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [borrando, setBorrando] = useState<Categoria | null>(null)

  const alError = (e: unknown) => {
    toast.error(mensajeError(e))
    void refrescar()
  }
  const reordenarCat = useMutation({ mutationFn: (ids: string[]) => reordenar('categorias', ids), onSettled: refrescar, onError: alError })
  const reordenarEt = useMutation({ mutationFn: (ids: string[]) => reordenar('etapas', ids), onSettled: refrescar, onError: alError })
  const activarEtapa = useMutation({
    mutationFn: (e: Etapa) => actualizarEtapa(e.id, { activo: !e.activo }),
    onSuccess: refrescar,
    onError: alError,
  })
  const borrar = useMutation({
    mutationFn: (c: Categoria) => borrarCategoria(c.id),
    onSuccess: async () => {
      await refrescar()
      toast.success('Categoría eliminada')
    },
    onError: alError,
  })

  const modelosEn = (categoriaId: string) => modelos.data?.filter((m) => m.categoria_id === categoriaId).length ?? 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Categorías</CardTitle>
          <CardDescription>Agrupan tus modelos: Silla, Mesa, Sofá…</CardDescription>
          {editar && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: 'nueva-categoria' })}>
                <Plus aria-hidden /> Agregar
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {categorias.isPending ? (
            <Skeleton className="h-32" />
          ) : categorias.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay categorías.</p>
          ) : (
            <ListaOrdenable
              items={categorias.data ?? []}
              nombre={(c) => c.nombre}
              deshabilitado={!editar}
              onReordenar={(ids) => reordenarCat.mutateAsync(ids)}
              render={(c) => (
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate">{c.nombre}</span>
                  <span className="text-sm text-muted-foreground tabular">{modelosEn(c.id)} modelos</span>
                  {editar && (
                    <>
                      <Button variant="ghost" size="icon" aria-label={`Renombrar ${c.nombre}`} onClick={() => setDialogo({ tipo: 'renombrar-categoria', item: c })}>
                        <Pencil aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${c.nombre}`} onClick={() => setBorrando(c)}>
                        <Trash2 aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etapas de producción</CardTitle>
          <CardDescription>El orden en que se fabrica un mueble. Se usan para costear y para las órdenes.</CardDescription>
          {editar && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: 'nueva-etapa' })}>
                <Plus aria-hidden /> Agregar
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {etapas.isPending ? (
            <Skeleton className="h-32" />
          ) : (
            <ListaOrdenable
              items={etapas.data ?? []}
              nombre={(e) => e.nombre}
              deshabilitado={!editar}
              onReordenar={(ids) => reordenarEt.mutateAsync(ids)}
              render={(e) => (
                <div className="flex items-center gap-2">
                  <span className={e.activo ? 'flex-1 truncate' : 'flex-1 truncate text-muted-foreground line-through'}>{e.nombre}</span>
                  {!e.activo && <Badge variant="outline">Inactiva</Badge>}
                  {editar && (
                    <>
                      <Switch
                        checked={e.activo}
                        onCheckedChange={() => activarEtapa.mutate(e)}
                        aria-label={`${e.activo ? 'Desactivar' : 'Activar'} ${e.nombre}`}
                      />
                      <Button variant="ghost" size="icon" aria-label={`Renombrar ${e.nombre}`} onClick={() => setDialogo({ tipo: 'renombrar-etapa', item: e })}>
                        <Pencil aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              )}
            />
          )}
          <p className="mt-3 text-sm text-muted-foreground">Las etapas no se borran: desactívalas para que no aparezcan en modelos y órdenes nuevas.</p>
        </CardContent>
      </Card>

      {dialogo && (
        <DialogoNombre
          abierto
          key={dialogo.tipo + ('item' in dialogo ? dialogo.item.id : '')}
          titulo={
            dialogo.tipo === 'nueva-categoria'
              ? 'Nueva categoría'
              : dialogo.tipo === 'nueva-etapa'
                ? 'Nueva etapa'
                : 'Renombrar'
          }
          etiqueta="Nombre"
          valorInicial={'item' in dialogo ? dialogo.item.nombre : ''}
          textoBoton={dialogo.tipo.startsWith('nueva') ? 'Agregar' : 'Guardar'}
          onCerrar={() => setDialogo(null)}
          onGuardar={async (nombre) => {
            if (dialogo.tipo === 'nueva-categoria') await crearCategoria(empresa!.id, nombre, (categorias.data?.length ?? 0) + 1)
            if (dialogo.tipo === 'renombrar-categoria') await renombrarCategoria(dialogo.item.id, nombre)
            if (dialogo.tipo === 'nueva-etapa') await crearEtapa(empresa!.id, nombre, (etapas.data?.length ?? 0) + 1)
            if (dialogo.tipo === 'renombrar-etapa') await actualizarEtapa(dialogo.item.id, { nombre })
            await refrescar()
          }}
        />
      )}

      <AlertDialog open={!!borrando} onOpenChange={(o) => !o && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la categoría {borrando?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              {borrando && modelosEn(borrando.id) > 0
                ? `Sus ${modelosEn(borrando.id)} modelos se quedan, pero sin categoría.`
                : 'No tiene modelos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => borrando && borrar.mutate(borrando)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
