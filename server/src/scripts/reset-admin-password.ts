#!/usr/bin/env tsx
/**
 * ============================================================================
 * LOCAL DEVELOPMENT ONLY — Admin Password Reset Utility
 * ============================================================================
 *
 * PURPOSE:
 *   Allows a local developer to reset the password of an existing admin user
 *   when the original password is unknown. This connects to Supabase via the
 *   service role key (read from .env) and updates only the password_hash column.
 *
 * SECURITY PROPERTIES:
 *   — NOT a public API endpoint. Must be run locally with .env credentials.
 *   — Does NOT expose existing password hashes in output.
 *   — Does NOT print the new password or resulting hash.
 *   — Does NOT modify role, email, is_active, or any other user field.
 *   — Uses the SAME hashPassword() function as the authentication system.
 *   — Requires confirmation before writing to the database.
 *
 * USAGE:
 *   npx tsx server/src/scripts/reset-admin-password.ts
 *
 * DO NOT DEPLOY THIS SCRIPT OR EXPOSE IT IN PRODUCTION.
 * ============================================================================
 */

import { createInterface } from 'readline';
import { stdin, stdout } from 'process';
import { getSupabase } from '../config/database.js';
import { hashPassword } from '../utils/password.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Read a password from stdin WITHOUT echoing characters to the terminal.
 * Prints nothing (asterisks would still leak length).
 */
function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    let password = '';
    stdin.on('data', (chunk: Buffer) => {
      const char = chunk.toString('utf8');
      // Ctrl+C — abort
      if (char === '\u0003') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\nAborted.\n');
        process.exit(1);
      }
      // Enter — done
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\n');
        resolve(password);
        return;
      }
      // Backspace — remove last char
      if (char === '\u007f' && password.length > 0) {
        password = password.slice(0, -1);
        return;
      }
      password += char;
    });
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(72));
  console.log('  LOCAL DEVELOPMENT — Admin Password Reset Utility');
  console.log('  ================================================');
  console.log('  This script resets an admin user\'s password.');
  console.log('  Run this ONLY on your local development machine.\n');
  console.log('  No password or hash will be displayed at any point.\n');

  const supabase = getSupabase();

  // Step 1: List admin users (emails only)
  const { data: admins, error: fetchError } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'admin')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('  Failed to fetch admin users:', fetchError.message);
    process.exit(1);
  }

  if (!admins || admins.length === 0) {
    console.log('  No admin users found in the database.');
    console.log('  Create one in Supabase SQL Editor (role = \'admin\') first.');
    process.exit(1);
  }

  console.log('  Available admin accounts:');
  admins.forEach((a, i) => console.log(`    [${i + 1}] ${a.email}`));
  console.log('');

  // Step 2: Select admin by number
  let selectedAdmin: { id: string; email: string };
  while (true) {
    const input = await ask('  Select admin account number (or press Enter to cancel): ');
    if (!input) {
      console.log('  Cancelled.');
      process.exit(0);
    }
    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > admins.length) {
      console.log('  Invalid selection. Enter a number between 1 and ' + admins.length);
      continue;
    }
    selectedAdmin = admins[num - 1];
    break;
  }

  console.log(`\n  Selected admin: ${selectedAdmin.email}`);

  // Step 3: Get new password (hidden)
  let newPassword: string;
  while (true) {
    newPassword = await askPassword('  Enter new password (min 12 chars, hidden): ');
    if (newPassword.length < 12) {
      console.log('  Password must be at least 12 characters. Try again.\n');
      continue;
    }
    const confirm = await askPassword('  Confirm new password: ');
    if (newPassword !== confirm) {
      console.log('  Passwords do not match. Try again.\n');
      continue;
    }
    break;
  }

  // Step 4: Confirmation prompt
  console.log('');
  console.log('  ── Summary ──────────────────────────────────────');
  console.log('  Target admin : ' + selectedAdmin.email);
  console.log('  Action       : Reset password_hash');
  console.log('  Other fields : Unchanged (role, email, active status)');
  console.log('');
  const confirm = await ask('  Type "RESET" to confirm: ');
  if (confirm !== 'RESET') {
    console.log('  Cancelled.');
    process.exit(0);
  }

  // Step 5: Hash password using the same method as auth system
  const newHash = hashPassword(newPassword);

  // Step 6: Update only password_hash
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: newHash })
    .eq('id', selectedAdmin.id);

  if (updateError) {
    console.error('\n  Password reset FAILED:', updateError.message);
    process.exit(1);
  }

  // Step 7: Verify the update (check only that hash changed, do NOT reveal it)
  const { data: updatedUser, error: verifyError } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('id', selectedAdmin.id)
    .single();

  if (verifyError || !updatedUser) {
    console.error('\n  Update may have failed — could not verify.');
    process.exit(1);
  }

  console.log('\n  ✓ Password reset successful for: ' + selectedAdmin.email);
  console.log('  ✓ password_hash updated');
  console.log('  ✓ You can now log in with the new password.');
  console.log('');
  console.log('  NOTE: No password or hash was displayed during this process.');
}

main().catch((err) => {
  console.error('\n  Unexpected error:', err.message);
  process.exit(1);
});
