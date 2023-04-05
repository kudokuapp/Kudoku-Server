import { arg, extendType, list, nonNull } from 'nexus';

export const BudgetingMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addBudgeting', {
      type: 'Budgeting',
      description: 'Create a new budgeting.',
      args: {
        budgetTypeId: nonNull(
          arg({
            type: 'BudgetTypeEnum',
            description: 'The budget type of this budgeting',
          })
        ),

        budgetName: nonNull(
          arg({
            type: 'String',
            description: 'The name of the budget',
          })
        ),

        amount: nonNull(
          arg({
            type: 'String',
            description: 'The amount of the budget',
          })
        ),
      },

      async resolve(
        __,
        { budgetName, budgetTypeId, amount },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          /**
           * Avoid same cash account name duplication
           */
          const searchBudget = await prisma.budgeting.findFirst({
            where: { AND: [{ budgetName }, { userId: user.id }] },
          });

          if (searchBudget) {
            throw new Error('Budget sudah ada');
          }

          const response = await prisma.budgeting.create({
            data: {
              userId: user.id,
              budgetName,
              budgetTypeId: budgetTypeId,
              createdAt: new Date(),
              lastUpdate: new Date(),
              amount,
            },
          });

          return response;
        } catch (error) {
          console.log(error);
          throw error;
        }
      },
    });

    t.nonNull.field('editBudgeting', {
      type: 'Budgeting',
      description: 'Edit budgeting.',
      args: {
        budgetTypeId: nonNull(
          arg({
            type: 'BudgetTypeEnum',
            description: 'The budget type of this budgeting',
          })
        ),

        budgetName: nonNull(
          arg({
            type: 'String',
            description: 'The name of the budget',
          })
        ),

        amount: nonNull(
          arg({
            type: 'String',
            description: 'The amount of the budget',
          })
        ),

        budgetingId: nonNull(
          arg({
            type: 'String',
            description: 'The id of that budgeting',
          })
        ),
      },

      async resolve(
        __,
        { budgetName, budgetTypeId, amount, budgetingId },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const budgeting = await prisma.budgeting.findFirstOrThrow({
            where: { AND: [{ id: budgetingId }] },
          });

          const response = await prisma.budgeting.update({
            where: { id: budgeting.id },
            data: {
              userId: user.id,
              budgetName,
              budgetTypeId,
              lastUpdate: new Date(),
              amount,
            },
          });

          return response;
        } catch (error) {
          console.log(error);
          throw error;
        }
      },
    });

    t.field('deleteBudgeting', {
      type: 'ResponseMessage',
      description: 'Delete budgeting.',
      args: {
        budgetingId: nonNull(
          arg({
            type: 'String',
            description: 'The id of that budgeting',
          })
        ),
      },

      async resolve(__, { budgetingId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const budgeting = await prisma.budgeting.findFirstOrThrow({
            where: { AND: [{ id: budgetingId }] },
          });

          const budgetName = budgeting.budgetName;

          await prisma.budgeting.delete({
            where: { id: budgetingId },
          });

          return {
            response: `Successfully delete ${budgetName}`,
          };
        } catch (error) {
          console.log(error);
          throw error;
        }
      },
    });
  },
});
