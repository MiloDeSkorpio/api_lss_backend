import { BlacklistRepository } from '../repositories/BlacklistRepository';
import { StolenCardsRepository } from '../repositories/StolenCardsRepository';
import type { Express } from 'express';
import fs from 'fs';
import csv from 'csv-parser';
import stripBomStream from 'strip-bom-stream';
import { validateHeaders } from '../utils/validation';
import { categorizeBLFiles, processFileBLGroup } from '../utils/files';
import { getResumeOfValidationBL } from '../utils/versions';

export class BlacklistService {
  constructor(
    private readonly blacklistRepo: BlacklistRepository,
    private readonly stolenCardsRepo: StolenCardsRepository,
  ) {}

  /**
   * Retrieves the latest active records from the blacklist.
   */
  async getLastVersionRecords() {
    const records = await this.blacklistRepo.getHighestVersionRecords('version_ln', 'estado');
    const transformedResult = records.map(record => {
      return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key.toLowerCase(), value])
      );
    });
    return transformedResult;
  }

  /**
   * Finds a card in the blacklist by its hex ID.
   */
  async findCardByHexId(hexId: string) {
    if (!hexId) {
      throw new Error('El parámetro hexId es requerido.');
    }
    const normalizedHex = hexId.padStart(16, '0');
    const result = await this.blacklistRepo.findByHexId(normalizedHex);
    return result;
  }

  /**
   * Processes a CSV file to find multiple cards by their hex IDs.
   */
  async findCardsFromFile(file: Express.Multer.File) {
    const recordsFound: any[] = [];
    const recordsNotFound: any[] = [];
    const REQ_HEADER = ['serial_hex'];

    return new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(stripBomStream())
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          const { missing } = validateHeaders(headers, REQ_HEADER);
          if (missing.length > 0) {
            reject(new Error(`Faltan columnas en el archivo: ${missing.join(', ')}`));
          }
        })
        .on('data', async (row) => {
          try {
            const card = await this.findCardByHexId(row.serial_hex);
            if (card) {
              recordsFound.push(card);
            } else {
              recordsNotFound.push(row);
            }
          } catch (error) {
            // Continue processing other rows
          }
        })
        .on('end', () => {
          resolve({ recordsFound, recordsNotFound });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Validates a set of 'altas' and 'bajas' files for creating a new blacklist version.
   */
  async validateFilesForNewVersion(files: Express.Multer.File[]) {
    const categorized = categorizeBLFiles(files);
    
    const [altasData, bajasData] = await Promise.all([
      processFileBLGroup(categorized.altas),
      processFileBLGroup(categorized.bajas)
    ]);

    const fileErrors = [...altasData, ...bajasData]
      .filter(result => result.errors && result.errors.length > 0)
      .map(result => ({ fileName: result.fileName, fileErrors: result.errors }));

    if (fileErrors.length > 0) {
      return { success: false, fileErrors };
    }

    const [
      currentVersionRecords,
      inactiveRecords,
      stolenCards
    ] = await Promise.all([
      this.blacklistRepo.getHighestVersionRecords('version_ln', 'estado'),
      this.blacklistRepo.findInactiveRecords(),
      this.stolenCardsRepo.findActiveStolenCards()
    ]);
    
    const currentVersion = await this.blacklistRepo.getMaxVersion('version_ln');
    const newVersion = currentVersion + 1;
    const keyField = 'card_serial_number';

    const { results: resultsByOrg, altasFinal, bajasFinal } = await getResumeOfValidationBL(
      altasData, 
      bajasData, 
      currentVersionRecords, 
      inactiveRecords, 
      stolenCards, 
      keyField
    );

    const currentVersionCount = currentVersionRecords.length;
    const newVersionRecordsCount = currentVersionCount + altasFinal.length - bajasFinal.length;

    return {
      success: true,
      newVersion,
      currentVersion,
      currentVersionCount,
      newVersionRecordsCount,
      altasValidas: altasFinal,
      bajasValidas: bajasFinal,
      resultsByOrg
    };
  }
}