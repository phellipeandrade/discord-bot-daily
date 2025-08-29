// Export types and schemas
export * from './types';

// Export base handler utilities
export * from './baseHandler';

// Export individual handlers
export { handleReminderIntent } from './reminderHandler';
export { handleTechnicalSupportIntent } from './technicalSupportHandler';
export { handleWorkflowHelpIntent } from './workflowHelpHandler';
export { handleTranslationIntent } from './translationHandler';
export { handleGeneralQuestionIntent } from './generalQuestionHandler';

// Export extended handlers
export {
  handleTaskManagementIntent,
  handleProjectInfoIntent,
  handleTeamCollaborationIntent,
  handleCodeReviewIntent,
  handleDeploymentIntent,
  handleMonitoringIntent,
  handleDocumentationIntent
} from './extendedHandlers';
