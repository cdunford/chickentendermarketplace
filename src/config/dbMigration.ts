import { upgradeFrom1To2 } from '../upgrade';

/**
 * @description DB upgrade / migration configuration.
 */
const dbMigration = {

  /**
   * @description Target DB version.
   */
  targetVersion: 2,

  /**
   * @description Upgrade migration steps.
   */
  steps: [
    {
      /**
       * @description Upgrade function to use from v1 to v2.
       */
      upgradeFunc: upgradeFrom1To2,

      /**
       * @description Version upgrading from.
       */
      from: 1,

      /**
       * @description Version upgrade to.
       */
      to: 2,
    },
  ],
};

export default dbMigration;
