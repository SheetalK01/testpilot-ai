import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

export default function NotFoundState({ what = 'page' }) {
  return (
    <EmptyState
      title={`This ${what} doesn't exist`}
      description={`It may have been deleted, or the link is wrong.`}
      action={
        <Button as={Link} to="/" variant="secondary" icon={ArrowLeft}>
          Back to dashboard
        </Button>
      }
    />
  );
}
