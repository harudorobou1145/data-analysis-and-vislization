import type { ReactNode } from 'react';
import { Box } from '@mui/material';

export function ContextSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" aria-label={title} sx={{
      py: 2, mb: 3, borderBlock: 1, borderColor: 'divider',
      color: 'text.secondary', lineHeight: 1.65,
      '& h2': { mt: 0, mb: 0.75, fontSize: '1.125rem', color: 'text.primary' },
      '& p': { m: 0 },
      '& p + p': { mt: 0.5 },
      '& strong': { color: 'text.primary' },
    }}>
      <h2>{title}</h2>
      {children}
    </Box>
  );
}
