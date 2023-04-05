import { arg, extendType, nonNull } from 'nexus';

export const BudgetingQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllBudgeting', {
      type: 'Budgeting',
      description: 'Get all budgeting for a particular user.',

      async resolve(__, ___, { userId, prisma }, ____) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const Budgeting = await prisma.budgeting.findMany({
            where: { userId },
          });

          let response: any[] = [];

          for (let i = 0; i < Budgeting.length; i++) {
            const element = Budgeting[i];

            const obj = {
              id: element.id,
              userId: element.userId,
              createdAt: element.createdAt,
              lastUpdate: element.lastUpdate,
              budgetName: element.budgetName,
              budgetTypeId: element.budgetTypeId,
              amount: element.amount
            };

            response.push(obj);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
    });
  },
});

