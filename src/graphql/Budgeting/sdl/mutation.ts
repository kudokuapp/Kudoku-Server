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

    t.field('deleteCategoryPlan', {
      type: 'ResponseMessage',
      description: 'Delete Category Plan.',
      args: {
        categoryPlanId: nonNull(
          arg({
            type: 'String',
            description: 'The id of that category plan',
          })
        ),
      },

      async resolve(__, { categoryPlanId }, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const categoryPlan = await prisma.categoryPlan.findFirstOrThrow({
            where: { AND: [{ id: categoryPlanId }] },
          });

          await prisma.categoryPlan.delete({
            where: { id: categoryPlanId },
          });

          return {
            response: `Successfully delete planning category`,
          };
        } catch (error) {
          console.log(error);
          throw error;
        }
      },
    });
  },
});

export const CategoryPlanMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('addCategoryPlan', {
      type: 'CategoryPlan',
      description: 'Create a new planning category.',
      args: {
        categoryId: nonNull(
          arg({
            type: 'String',
            description: 'Category id of this planning category',
          })
        ),

        budgetId: nonNull(
          arg({
            type: 'String',
            description: 'Budget id of this planning category',
          })
        ),

        tagId: nonNull(
          arg({
            type: 'String',
            description: 'Tag id of this planning category',
          })
        ),

        monthly: nonNull(
          arg({
            type: 'Boolean',
            description: 'Is this planning category is same for all month or not ?',
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
        { categoryId, budgetId, tagId, monthly, amount },
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
          const searchBudget = await prisma.categoryPlan.findFirst({
            where: { categoryId: categoryId },
          });

          if (searchBudget) {
            throw new Error('Category Plan sudah ada');
          }

          const response = await prisma.categoryPlan.create({
            data: {
              categoryId: categoryId,
              budgetId: budgetId,
              tagId: tagId,
              monthly: monthly,
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

    t.nonNull.field('editCategoryPlan', {
      type: 'CategoryPlan',
      description: 'Edit Planning Category.',
      args: {
        categoryId: nonNull(
          arg({
            type: 'String',
            description: 'Category id of this planning category',
          })
        ),

        tagId: nonNull(
          arg({
            type: 'String',
            description: 'Tag id of this planning category',
          })
        ),

        monthly: nonNull(
          arg({
            type: 'Boolean',
            description: 'Is this planning category is same for all month or not ?',
          })
        ),

        amount: nonNull(
          arg({
            type: 'String',
            description: 'The amount of the category plan',
          })
        ),

        categoryPlanId: nonNull(
          arg({
            type: 'String',
            description: 'The amount of this category plan',
          })
        ),
      },

      async resolve(
        __,
        { categoryId, tagId, monthly, amount, categoryPlanId },
        { userId, prisma },
        ___
      ) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
          });

          const budgeting = await prisma.categoryPlan.findFirstOrThrow({
            where: { AND: [{ id: categoryPlanId }] },
          });

          const response = await prisma.categoryPlan.update({
            where: { id: budgeting.id },
            data: {
              categoryId: categoryId,
              tagId: tagId,
              monthly: monthly,
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
