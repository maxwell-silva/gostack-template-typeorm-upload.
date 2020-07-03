import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import transactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getCustomRepository(transactionsRepository);

    const transaction = await transactionRepository.findOne(id);

    if (!transaction) {
      throw new AppError(
        'transaction does not exist or has already been deleted',
        400,
      );
    }
    await transactionRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
