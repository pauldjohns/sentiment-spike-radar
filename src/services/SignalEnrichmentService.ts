
// Import all services from the modular structure
import { SignalEnrichmentClient } from './signal-enrichment/SignalEnrichmentClient';
import { SignalEnrichmentMutations } from './signal-enrichment/SignalEnrichmentMutations';
import { SignalAnalysisService } from './signal-enrichment/SignalAnalysisService';
import { SignalLearningService } from './signal-enrichment/SignalLearningService';

// Re-export all services from the modular structure for backward compatibility
export { SignalEnrichmentClient } from './signal-enrichment/SignalEnrichmentClient';
export { SignalEnrichmentMutations } from './signal-enrichment/SignalEnrichmentMutations';
export { SignalAnalysisService } from './signal-enrichment/SignalAnalysisService';
export { SignalLearningService } from './signal-enrichment/SignalLearningService';
export type { EnrichedSignal, SignalSuccessMetrics } from './signal-enrichment/types';

// Main service class that orchestrates all operations
export class SignalEnrichmentService {
  // Delegate all methods to the appropriate service classes
  static getEnrichedSignals = SignalEnrichmentClient.getEnrichedSignals;
  static getSignalSuccessMetrics = SignalEnrichmentClient.getSignalSuccessMetrics;
  static getEnrichmentStats = SignalEnrichmentClient.getEnrichmentStats;
  
  static createEnrichedSignal = SignalEnrichmentMutations.createEnrichedSignal;
  static updateSignalConfidence = SignalEnrichmentMutations.updateSignalConfidence;
  
  static evaluateSignalSuccess = SignalAnalysisService.evaluateSignalSuccess;
  static analyzeSignalPatterns = SignalAnalysisService.analyzeSignalPatterns;
  
  static logSignalLearningData = SignalLearningService.logSignalLearningData;
  static exportLearningData = SignalLearningService.exportLearningData;
}
