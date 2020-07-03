import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVImport {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const contactsReadStream = fs.createReadStream(filePath);
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = contactsReadStream.pipe(parseStream);

    const transactions: CSVImport[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line.map((cell: string) => cell);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const CSVcategories = transactions.reduce(
      (result: string[], currentValue: CSVImport) => {
        return result.includes(`${currentValue.category}`)
          ? result
          : [...result, currentValue.category];
      },
      [],
    );

    const existingCategories = await categoriesRepository.find({
      title: In(CSVcategories),
    });

    const existingCategoriesTitles = existingCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitles = CSVcategories.filter(
      category => !existingCategoriesTitles.includes(category),
    );

    const newCategories = categoriesRepository.create(
      addCategoriesTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existingCategories];
    const newTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newTransactions);

    return newTransactions;
  }
}

export default ImportTransactionsService;
