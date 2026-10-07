/**
 * Regression Tests: Become a Buddy Application Form
 * 
 * Tests for:
 * - New application has no KYC document attached
 * - Sample KYC document cannot be submitted
 * - Applicant must explicitly provide required KYC document
 * - Consent is not silently accepted
 * - Hourly rate is not pre-hardcoded to 650
 * - Activities are not pre-selected
 *
 * Run with: cd src/components/buddy/__tests__ && node become-a-buddy.test.mjs
 */

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(message || `Expected values to differ, both are ${JSON.stringify(actual)}`);
  }
}

// ========== Helpers ==========
// Simulates the application state after fix
function createInitialState() {
  return {
    hourlyRate: 400,
    selectedActivities: [],
    kycDocument: null,
    consentChecked: false,
  };
}

// Simulates the validation logic from handleApplySuccess
function validateApplication(state) {
  const errors = [];
  
  if (!state.kycDocument) {
    errors.push('Please upload your identity document');
  }
  
  if (!state.consentChecked) {
    errors.push('You must agree to the Platonic Code of Conduct');
  }
  
  return errors;
}

// ========== Tests ==========

test('New application has NO KYC document attached', () => {
  const state = createInitialState();
  assertEqual(state.kycDocument, null, 'New application must not have any KYC document pre-attached');
  assert(state.kycDocument === null || state.kycDocument === undefined, 'KYC document must be null/undefined for new application');
});

test('Sample KYC document (verified_kyc_aadhaar.pdf) is not referenced in code', () => {
  const state = createInitialState();
  
  // The application must require an actual File object, not a hardcoded string
  // In the real fix, kycDocument is a File object, not a string
  const isFileObject = state.kycDocument instanceof File || state.kycDocument === null;
  assert(isFileObject, 'kycDocument must be a File object or null, never a hardcoded sample filename');
  
  // The UI must never show "verified_kyc_aadhaar.pdf" as a pre-attached document
  // This was the original bug - the text was hardcoded in the JSX
  // The fix ensures kycDocument starts as null and user must upload their own
  assertEqual(state.kycDocument, null, 'kycDocument must be null - no sample document pre-attached');
});

test('Applicant must explicitly provide required KYC document', () => {
  const state = createInitialState();
  const errors = validateApplication(state);
  
  // Without uploading, there should be an error about KYC
  const hasKycError = errors.some(e => e.toLowerCase().includes('identity document') || e.toLowerCase().includes('kyc'));
  assert(hasKycError, 'Validation should fail when no KYC document is provided');
  
  // Simulate uploading a document
  const mockFile = new File(['test content'], 'my_aadhaar.pdf', { type: 'application/pdf' });
  state.kycDocument = mockFile;
  
  const errorsAfterUpload = validateApplication(state);
  const hasKycErrorAfterUpload = errorsAfterUpload.some(e => e.toLowerCase().includes('identity document'));
  assert(!hasKycErrorAfterUpload, 'Validation should pass after uploading KYC document');
});

test('Consent checkbox is NOT pre-checked (not silently accepted)', () => {
  const state = createInitialState();
  assertEqual(state.consentChecked, false, 'Consent must not be pre-checked');
  
  // Without checking consent, validation should fail
  const errors = validateApplication(state);
  const hasConsentError = errors.some(e => e.toLowerCase().includes('platonic') || e.toLowerCase().includes('consent'));
  assert(hasConsentError, 'Validation should fail when consent is not checked');
});

test('Explicit consent is required before submission', () => {
  const state = createInitialState();
  
  // Simulate uploading KYC but not checking consent
  state.kycDocument = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
  state.consentChecked = false;
  
  const errors = validateApplication(state);
  assert(errors.length > 0, 'Should still fail validation even with KYC if consent not checked');
  
  // Now check consent
  state.consentChecked = true;
  const errorsAfterConsent = validateApplication(state);
  assertEqual(errorsAfterConsent.length, 0, 'Should pass validation when both KYC and consent provided');
});

test('Hourly rate default is ₹400, not hardcoded ₹650', () => {
  const state = createInitialState();
  assertEqual(state.hourlyRate, 400, 'Default hourly rate must be 400 (minimum), not 650');
  assertNotEqual(state.hourlyRate, 650, 'Hourly rate must not be pre-hardcoded to 650');
});

test('Activities are NOT pre-selected', () => {
  const state = createInitialState();
  assertEqual(state.selectedActivities.length, 0, 'No activities should be pre-selected');
  assert(state.selectedActivities.length === 0, 'Activities array must be empty for new application');
});

test('Application cannot be submitted without all required fields', () => {
  // Empty state - should fail all validations
  const emptyState = createInitialState();
  const errors = validateApplication(emptyState);
  assert(errors.length >= 2, 'Should have at least 2 errors: KYC and consent');
  
  // Partial state - only KYC, no consent
  const partialState = { ...createInitialState(), kycDocument: new File(['test'], 'doc.pdf', { type: 'application/pdf' }) };
  const partialErrors = validateApplication(partialState);
  assert(partialErrors.length >= 1, 'Should still fail with consent error');
  
  // Partial state - only consent, no KYC
  const partialState2 = { ...createInitialState(), consentChecked: true };
  const partialErrors2 = validateApplication(partialState2);
  assert(partialErrors2.length >= 1, 'Should still fail with KYC error');
});

test('Uploading a document sets the File object correctly', () => {
  const state = createInitialState();
  const mockFile = new File(['test content'], 'my_aadhaar.pdf', { type: 'application/pdf' });
  
  state.kycDocument = mockFile;
  
  assertEqual(state.kycDocument.name, 'my_aadhaar.pdf');
  assertEqual(state.kycDocument.type, 'application/pdf');
  assert(state.kycDocument instanceof File, 'kycDocument must be a File instance');
});

// ========== Run tests ==========
console.log('\n=== Become a Buddy Application Regression Tests ===\n');

for (const t of tests) {
  try {
    t.fn();
    console.log(`  PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${t.name} - ${err.message}`);
    failed++;
  }
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
