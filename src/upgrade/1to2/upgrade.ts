import { User } from '../../users';

/**
 * @description Upgrades the database from version 1 to 2.
 * @export
 * @returns {Promise<any>} Resolved when the upgrade is complete.
 */
export function upgradeFrom1To2() {
  return User.updateMany({}, {
    $set: {
      activated: true,
    },
  }).exec();
}
