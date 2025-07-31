import { InferAttributes, Model, ModelStatic, Sequelize, WhereOptions } from 'sequelize'
import { checkDuplicates, eliminarRegistros, validateChangeInRecord } from "./validation"

export async function processVersionUpdate<T extends Model>(
  currentVersionRecords: any[],
  model: ModelStatic<T>,
  altasData: any[],
  bajasData: any[],
  cambiosData: any[],
  keyField: string
) {

  const currentVersion = await getMaxVersion(model)
  const newVersion = currentVersion + 1

  const allInvalidRecords = await getInvalidRecords(model)

  const { datosValidos: bajasValidas, datosDuplicados: bajasInactivas } = checkDuplicates(allInvalidRecords, bajasData, keyField)

  const { cambiosValidos, sinCambios } = validateChangeInRecord(currentVersionRecords, cambiosData)

  const { datosValidos: altasValidas, datosDuplicados: altasDuplicadas } = checkDuplicates(currentVersionRecords, altasData, keyField)

  const finalRecords = eliminarRegistros(currentVersionRecords, altasValidas, cambiosValidos)

  const newRecords = [...finalRecords, ...altasValidas]

  const transaction = await model.sequelize.transaction()

  try {
    if (bajasValidas.length > 0 || cambiosValidos.length > 0 || altasValidas.length > 0) {

      if (bajasValidas.length > 0) {
        const serialesBajas = bajasValidas.map(item => item.SERIAL_DEC)

        await model.update(
          { ESTADO: 'INACTIVO', VERSION: newVersion },
          {
            where: {
              SERIAL_DEC: serialesBajas,
              ESTADO: 'ACTIVO',
              VERSION: currentVersion
            } as WhereOptions<InferAttributes<T>>,
            transaction
          }
        )
      }
      try {
        
        if (cambiosValidos.length > 0) {
          await Promise.all(
            cambiosValidos.map(item =>
              model.upsert(
                { ...item, VERSION: newVersion },
                {
                  transaction,
                  conflictFields: ['SERIAL_DEC'] // Campo único para determinar si existe
                }
              )
            )
          );
        }
        if (newRecords.length > currentVersionRecords.length || newRecords.length < currentVersionRecords.length) {
          await model.bulkCreate(
            newRecords.map(item => ({
              ...item,
              VERSION: newVersion
            })),
            { transaction }
          )
        }
  
        await transaction.commit()
  
        const newVersionRecords = await model.findAll({
          where: { VERSION: newVersion },
          raw: true
        })
  
        return {
          success: true,
          newVersion,
          newRecordsCount: newVersionRecords.length,
          newRecordsVersion: newVersionRecords,
          altasDuplicadas,
          bajasInactivas,
          sinCambios
        }
      } catch (error) {
        console.error(error.message)
      }

    } else {
      return { success: false }
    }

  } catch (error) {
    await transaction.rollback()
    console.error('Error en procesamiento:', error)
    throw error
  }
}

export async function getMaxVersion(model) {
  try {
    const maxVersion = await model.max('VERSION' as string)
    return maxVersion || 0
  } catch (error) {
    throw new Error(`Error al consultar la version maxima en ${model.name}: `, error)
  }
}

export async function getInvalidRecords(model) {
  try {
    const allInvalidRecords = await model.findAll({
      where: {
        ESTADO: 'INACTIVO'
      },
      raw: true
    })
    return allInvalidRecords || 'No hay Registros'
  } catch (error) {
    throw new Error(`No se pudieron obtener los registros Inactivos de ${model.name}`)
  }
}

export async function getHighestVersionRecords<T extends Model>(
  model: ModelStatic<T>,
  versionField: keyof InferAttributes<T> = 'VERSION' as keyof InferAttributes<T>,
  statusField: keyof InferAttributes<T> = 'ESTADO' as keyof InferAttributes<T>,
): Promise<T[]> {
  try {

    const tableExists = await model.sequelize?.getQueryInterface().tableExists(model.tableName)

    if (!tableExists) {
      await model.sync()
      return []
    }
    const maxVersion = await model.max(versionField as string)

    if (maxVersion === null || maxVersion === undefined) {
      return []
    }

    const result = await model.findAll({
      where: {
        [versionField]: maxVersion,
        [statusField]: 'ACTIVO'
      } as WhereOptions<InferAttributes<T>>,
      raw: true
    })

    return result

  } catch (error) {
    console.error(`Error in getHighestVersion (table: ${model.tableName}):`, error)
    throw error
  }
}

export async function getAllVersions<T extends Model>(model: ModelStatic<T>) {
  const versions = await model.findAll({
    attributes: [
      [Sequelize.fn('DISTINCT', Sequelize.col('VERSION')), 'VERSION']
    ],
    order: [['VERSION', 'DESC']],
    raw: true
  })
  return versions
}

export async function getAllRecordsBySelectedVersion<T extends Model>(
  model: ModelStatic<T>,
  version: number
): Promise<T[]> {
  const records = await model.findAll({
    where: {
      VERSION: version
    } as any,
    raw: true
  })
  return records
}
