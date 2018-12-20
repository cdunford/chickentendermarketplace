import { currentUserInOrder, currentUserNotInOrder } from '../orders';
import { currentUserHasRole, isCurrentUserId, isNotCurrentUserId } from '../users';
import { arrayContains, imageFromBinary } from '../utility';

/**
 * @description Dust template helper functions.
 */
const dustHelpers = [
  {
    name: 'arrayContains',
    function: arrayContains,
  },
  {
    name: 'currentUserHasRole',
    function: currentUserHasRole,
  },
  {
    name: 'isCurrentUserId',
    function: isCurrentUserId,
  },
  {
    name: 'isNotCurrentUserId',
    function: isNotCurrentUserId,
  },
  {
    name: 'imageFromBinary',
    function: imageFromBinary,
  },
  {
    name: 'currentUserInOrder',
    function: currentUserInOrder,
  },
  {
    name: 'currentUserNotInOrder',
    function: currentUserNotInOrder,
  },
];

export default dustHelpers;
