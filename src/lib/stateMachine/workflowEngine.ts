import { DonationStatus, AssignmentStatus, UserRole } from '../types';

export interface TransitionRule {
  from: DonationStatus;
  to: DonationStatus;
  allowedRoles: (UserRole | 'SYSTEM_AGENT')[];
  actionName: string;
  description: string;
}

// Explicit state machine definition
export const ALLOWED_TRANSITIONS: TransitionRule[] = [
  {
    from: 'AVAILABLE',
    to: 'MATCHING',
    allowedRoles: ['DONOR', 'COORDINATOR', 'SYSTEM_AGENT'],
    actionName: 'START_MATCHING',
    description: 'Find candidate recipients matching category, safety, and capacity rules',
  },
  {
    from: 'AVAILABLE',
    to: 'PROPOSED',
    allowedRoles: ['COORDINATOR', 'SYSTEM_AGENT'],
    actionName: 'PROPOSE_MATCH_DIRECT',
    description: 'Directly propose eligible recipient for available donation',
  },
  {
    from: 'AVAILABLE',
    to: 'CANCELLED',
    allowedRoles: ['DONOR', 'COORDINATOR'],
    actionName: 'CANCEL_DONATION',
    description: 'Donor or coordinator cancelled available surplus listing',
  },
  {
    from: 'AVAILABLE',
    to: 'EXPIRED',
    allowedRoles: ['SYSTEM_AGENT', 'COORDINATOR'],
    actionName: 'MARK_EXPIRED',
    description: 'Donation collection deadline lapsed before proposal',
  },
  {
    from: 'MATCHING',
    to: 'PROPOSED',
    allowedRoles: ['SYSTEM_AGENT', 'COORDINATOR'],
    actionName: 'PROPOSE_MATCH',
    description: 'Proposed eligible recipient for matching donation',
  },
  {
    from: 'MATCHING',
    to: 'AVAILABLE',
    allowedRoles: ['SYSTEM_AGENT', 'COORDINATOR'],
    actionName: 'REVERT_TO_AVAILABLE',
    description: 'No feasible match found within radius, reverted to available pool',
  },
  {
    from: 'PROPOSED',
    to: 'APPROVED',
    allowedRoles: ['COORDINATOR'],
    actionName: 'APPROVE_ASSIGNMENT',
    description: 'Human coordinator verified safety and logistics and approved assignment',
  },
  {
    from: 'PROPOSED',
    to: 'DECLINED',
    allowedRoles: ['RECIPIENT', 'COORDINATOR'],
    actionName: 'DECLINE_ASSIGNMENT',
    description: 'Recipient or coordinator declined assignment proposal',
  },
  {
    from: 'PROPOSED',
    to: 'CANCELLED',
    allowedRoles: ['DONOR', 'COORDINATOR'],
    actionName: 'CANCEL_PROPOSAL',
    description: 'Donation cancelled while proposal was pending',
  },
  {
    from: 'APPROVED',
    to: 'ACCEPTED',
    allowedRoles: ['RECIPIENT'],
    actionName: 'ACCEPT_ASSIGNMENT',
    description: 'Recipient officially confirmed intake capability and accepted handover',
  },
  {
    from: 'APPROVED',
    to: 'DECLINED',
    allowedRoles: ['RECIPIENT', 'COORDINATOR'],
    actionName: 'DECLINE_ASSIGNMENT',
    description: 'Recipient declined after approval (triggers recovery)',
  },
  {
    from: 'ACCEPTED',
    to: 'PICKUP_CONFIRMED',
    allowedRoles: ['VOLUNTEER', 'COORDINATOR'],
    actionName: 'CONFIRM_PICKUP',
    description: 'Volunteer arrived on site, checked temp/packaging, and loaded food',
  },
  {
    from: 'ACCEPTED',
    to: 'FAILED',
    allowedRoles: ['VOLUNTEER', 'COORDINATOR'],
    actionName: 'REPORT_PICKUP_FAILURE',
    description: 'Volunteer arrived but food was spoiled or donor was unavailable',
  },
  {
    from: 'PICKUP_CONFIRMED',
    to: 'DELIVERED',
    allowedRoles: ['VOLUNTEER', 'RECIPIENT', 'COORDINATOR'],
    actionName: 'CONFIRM_DELIVERY',
    description: 'Food weighed on scale, inspected by recipient, and signed off',
  },
  {
    from: 'PICKUP_CONFIRMED',
    to: 'FAILED',
    allowedRoles: ['VOLUNTEER', 'COORDINATOR'],
    actionName: 'REPORT_TRANSIT_FAILURE',
    description: 'Vehicle breakdown or severe temperature breach during transit',
  },
  {
    from: 'DECLINED',
    to: 'RECOVERY_PENDING',
    allowedRoles: ['SYSTEM_AGENT', 'COORDINATOR'],
    actionName: 'INITIATE_RECOVERY',
    description: 'Agent 4 actively re-evaluating backup candidates',
  },
  {
    from: 'RECOVERY_PENDING',
    to: 'PROPOSED',
    allowedRoles: ['SYSTEM_AGENT', 'COORDINATOR'],
    actionName: 'PROPOSE_ALTERNATIVE',
    description: 'Alternative candidate recipient successfully matched and proposed',
  },
  {
    from: 'RECOVERY_PENDING',
    to: 'FAILED',
    allowedRoles: ['SYSTEM_AGENT', 'COORDINATOR'],
    actionName: 'EXHAUST_RECOVERY',
    description: 'All feasible recipients exhausted or deadline too close',
  },
];

export class WorkflowEngine {
  /**
   * Validate if a state transition is legal
   */
  static canTransition(
    currentStatus: DonationStatus,
    targetStatus: DonationStatus,
    actorRole: UserRole | 'SYSTEM_AGENT'
  ): { allowed: boolean; reason?: string } {
    // Delivered is strictly terminal
    if (currentStatus === 'DELIVERED') {
      return { allowed: false, reason: 'Terminal status: Delivered donations cannot be transitioned or reassigned' };
    }

    // Expired cannot be assigned
    if (currentStatus === 'EXPIRED') {
      return { allowed: false, reason: 'Terminal status: Expired donations cannot be assigned or reactivated' };
    }

    // Cancelled cannot be assigned
    if (currentStatus === 'CANCELLED') {
      return { allowed: false, reason: 'Terminal status: Cancelled donations cannot be reactivated' };
    }

    const match = ALLOWED_TRANSITIONS.find(
      t => t.from === currentStatus && t.to === targetStatus
    );

    if (!match) {
      return {
        allowed: false,
        reason: `Invalid workflow transition: Cannot move from state '${currentStatus}' to '${targetStatus}'`,
      };
    }

    if (!match.allowedRoles.includes(actorRole)) {
      return {
        allowed: false,
        reason: `Permission denied: Role '${actorRole}' is not authorized to perform action '${match.actionName}' from '${currentStatus}' to '${targetStatus}'`,
      };
    }

    return { allowed: true };
  }

  /**
   * Return list of legal next statuses from a given status
   */
  static getNextPossibleStates(currentStatus: DonationStatus, role: UserRole | 'SYSTEM_AGENT'): DonationStatus[] {
    return ALLOWED_TRANSITIONS
      .filter(t => t.from === currentStatus && t.allowedRoles.includes(role))
      .map(t => t.to);
  }

  /**
   * Maps donation status to equivalent assignment status
   */
  static mapToAssignmentStatus(donationStatus: DonationStatus): AssignmentStatus | null {
    switch (donationStatus) {
      case 'PROPOSED': return 'PROPOSED';
      case 'APPROVED': return 'APPROVED';
      case 'ACCEPTED': return 'ACCEPTED';
      case 'PICKUP_CONFIRMED': return 'PICKUP_CONFIRMED';
      case 'DELIVERED': return 'DELIVERED';
      case 'DECLINED': return 'DECLINED';
      case 'CANCELLED': return 'CANCELLED';
      case 'FAILED': return 'FAILED';
      default: return null;
    }
  }
}
