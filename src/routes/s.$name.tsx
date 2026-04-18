import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/s/$name')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/s/$name"!</div>
}
