import { bootstrapInventory } from '../server/domain/inventory/bootstrap.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => arg !== '--apply' && arg !== '--dry-run'))
  throw new Error('Usage: pnpm inventory:bootstrap [--dry-run | --apply]. The default is a read-only plan.');
const result = await bootstrapInventory({ dryRun: !args.includes('--apply') });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
