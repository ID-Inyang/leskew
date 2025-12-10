// server/utils/mongoUtils.js
import mongoose from 'mongoose';

class MongoUtils {
  /**
   * Safely convert string to ObjectId
   * @param {string|ObjectId} id - String or ObjectId
   * @returns {ObjectId|null} - ObjectId or null if invalid
   */
  static toObjectId(id) {
    try {
      if (!id) return null;
      if (id instanceof mongoose.Types.ObjectId) return id;
      if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
      }
      return null;
    } catch (error) {
      console.error('Error converting to ObjectId:', error);
      return null;
    }
  }

  /**
   * Compare two IDs safely
   * @param {string|ObjectId} id1 - First ID
   * @param {string|ObjectId} id2 - Second ID
   * @returns {boolean} - True if equal
   */
  static areIdsEqual(id1, id2) {
    try {
      const objId1 = this.toObjectId(id1);
      const objId2 = this.toObjectId(id2);
      
      if (!objId1 || !objId2) return false;
      return objId1.equals(objId2);
    } catch (error) {
      console.error('Error comparing IDs:', error);
      return false;
    }
  }

  /**
   * Create ObjectId for aggregation queries
   * @param {string|ObjectId} id - ID to convert
   * @returns {ObjectId} - For use in aggregation pipelines
   */
  static aggregateId(id) {
    return this.toObjectId(id) || new mongoose.Types.ObjectId();
  }

  /**
   * Check if string is valid ObjectId
   * @param {string} id - String to check
   * @returns {boolean}
   */
  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Convert array of strings to ObjectIds
   * @param {string[]} ids - Array of string IDs
   * @returns {ObjectId[]} - Array of ObjectIds
   */
  static toObjectIdArray(ids) {
    if (!Array.isArray(ids)) return [];
    return ids
      .map(id => this.toObjectId(id))
      .filter(id => id !== null);
  }
}

export default MongoUtils;