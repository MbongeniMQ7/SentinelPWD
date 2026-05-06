import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/owner/alerts')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/owner/alerts"!</div>
}
