import { RouteErrorPage } from '@/components/errors/RouteErrorPage';

export default function NotFound() {
  return (
    <RouteErrorPage
      code="404"
      title="Page not found"
      description="The page may have moved, the link may be incomplete, or you may not have access to this workspace resource."
    />
  );
}
