import cron from 'node-cron';
import { getSupabase } from '../config/database.js';

let isRunning = false;

/**
 * Cleanup job: Expire stale pending bookings
 * 
 * Runs every 5 minutes to find and expire pending bookings
 * where expires_at has passed.
 * 
 * Idempotent: Running multiple times is safe. Already-expired
 * bookings won't match the WHERE clause.
 */
export async function cleanupExpiredBookings(): Promise<number> {
  if (isRunning) {
    console.log('[CLEANUP] Previous run still in progress, skipping...');
    return 0;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    const supabase = getSupabase();

    // Find and expire stale pending bookings
    const { data: expiredBookings, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id, booking_code');

    if (error) {
      console.error('[CLEANUP] Error expiring bookings:', error.message);
      return 0;
    }

    const count = expiredBookings?.length || 0;
    
    if (count > 0) {
      const elapsed = Date.now() - startTime;
      console.log(`[CLEANUP] Expired ${count} booking(s) in ${elapsed}ms`);
    }

    return count;
  } catch (err: any) {
    console.error('[CLEANUP] Unexpected error:', err.message);
    return 0;
  } finally {
    isRunning = false;
  }
}

/**
 * Register the cleanup cron job
 * 
 * Runs every 5 minutes.
 * Can be disabled by setting DISABLE_CLEANUP_JOB=true in env.
 */
export function registerCleanupJob(): void {
  if (process.env.DISABLE_CLEANUP_JOB === 'true') {
    console.log('[CLEANUP] Cleanup job disabled via DISABLE_CLEANUP_JOB env var');
    return;
  }

  // Run every 5 minutes
  const schedule = process.env.CLEANUP_CRON_SCHEDULE || '*/5 * * * *';
  
  cron.schedule(schedule, async () => {
    await cleanupExpiredBookings();
  });

  console.log(`[CLEANUP] Scheduled cleanup job: ${schedule}`);
}

// Allow running standalone for testing
if (process.argv[1]?.endsWith('cleanupPendingBookings.js') || process.env.RUN_CLEANUP_ONCE === 'true') {
  cleanupExpiredBookings()
    .then((count) => {
      console.log(`[CLEANUP] Standalone run complete. Expired ${count} bookings.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[CLEANUP] Standalone run failed:', err);
      process.exit(1);
    });
}
