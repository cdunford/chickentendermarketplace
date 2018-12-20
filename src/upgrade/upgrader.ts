import { Document, model, Schema } from 'mongoose';

/**
 * @description Mongoose schema for the DB version document.
 */
const versionSchema = new Schema({
  version: {
    required: true,
    type: Number,
  },
});

/**
 * @description The version document entity.
 * @interface IVersionDocument
 * @extends {Document}
 */
interface IVersionDocument extends Document {
  version: number;
}

const Version = model<IVersionDocument>('schemaVersion', versionSchema, 'schemaVersion');

/**
 * @description Represents an individual DB upgrade step.
 * @export
 * @interface IUpgradeStep
 */
export interface IUpgradeStep {
  /**
   * @description The function to perform the upgrade.
   * @memberof IUpgradeStep
   */
  upgradeFunc: () => Promise<any>;

  /**
   * @description The DB version this step upgrades from.
   * @type {number}
   * @memberof IUpgradeStep
   */
  from: number;

  /**
   * @description The DB version this step upgrades to.
   * @type {number}
   * @memberof IUpgradeStep
   */
  to: number;
}

/**
 * @description Represents the DB upgrade configuration.
 * @export
 * @interface IUpgradeConfig
 */
export interface IUpgradeConfig {
  /**
   * @description The target version.
   * @type {number}
   * @memberof IUpgradeConfig
   */
  targetVersion: number;

  /**
   * @description The steps used to reach the target version.
   * @type {IUpgradeStep[]}
   * @memberof IUpgradeConfig
   */
  steps: IUpgradeStep[];
}

/**
 * @description Upgrades the database to the target version using the configured steps.
 * @export
 * @param {IUpgradeConfig} upgradeConfig The upgrade configuration.
 * @returns {Promise<any>} Resolved when the upgrade is completed.
 */
export function upgradeDatabase(upgradeConfig: IUpgradeConfig) {
  return Version.findOne({}).exec().then((version) => {
    if (!version) {
      version = new Version({
        version: 1,
      });
      return version.save();
    }
    return version;
  }).then((version) => upgrade(upgradeConfig, version));
}

/**
 * @description Recursive upgrade function.
 * @param {IUpgradeConfig} upgradeConfig The upgrade configuration.
 * @param {IVersionDocument} version The current version document.
 * @returns {Promise<any> | void} Resolved when the upgrade is complete, or returns
 *  nothing if no upgrade to perform.
 */
function upgrade(upgradeConfig: IUpgradeConfig, version: IVersionDocument) {
  if (version.version === upgradeConfig.targetVersion) {
    return;
  }

  const nextStep = upgradeConfig.steps.find((step) => step.from === version.version);
  if (!nextStep) {
    throw new Error(`No upgrade step from ${version.version}`);
  }

  return nextStep.upgradeFunc().then(() => {
    version.version = nextStep.to;
    return version.save();
  }).then((updatedVersion) => upgrade(upgradeConfig, updatedVersion));
}
