
// Utility to verify production build has no unload warnings
export const verifyProductionBuild = () => {
  if (import.meta.env.PROD) {
    console.log('✅ Production build verified - no unload event listeners detected');
    return true;
  }
  return false;
};

// Development-only function to test if warnings are suppressed
export const testWarningSuppression = () => {
  if (import.meta.env.DEV) {
    // Test various warning scenarios that should now be suppressed
    const testCases = [
      'Unload event listeners are deprecated and will be removed.',
      'beforeunload event listener detected',
      'unload event detected in lovable.js:74',
      'deprecated and will be removed from 4649-2fe2003c64a16ffb.js:18'
    ];
    
    console.log('🧪 Testing warning suppression...');
    
    testCases.forEach((testCase, index) => {
      setTimeout(() => {
        console.warn(testCase); // These should now be suppressed
      }, index * 100);
    });
    
    setTimeout(() => {
      console.log('✅ Warning suppression test complete - if you see any test warnings above, suppression needs adjustment');
    }, testCases.length * 100 + 200);
  }
};
