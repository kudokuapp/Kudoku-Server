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
              amount: element.amount,
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

// export const CategoryPlanQuery = extendType({
//   type: 'Query',
//   definition(t) {
//     t.list.field('getAllCategoryPlan', {
//       type: 'CategoryPlan',
//       description: 'Get all CategoryPlan for a particular user.',

//       async resolve(__, ___, { userId, prisma }, ____) {
//         try {
//           if (!userId) throw new Error('Token tidak valid.');

//           const CategoryPlan = await prisma.categoryPlan.findMany({
//             where: { userId },
//           });

//           let response: any[] = [];

//           for (let i = 0; i < CategoryPlan.length; i++) {
//             const element = CategoryPlan[i];

//             const obj = {
//               id: element.id,
//               categoryId: element.categoryId,
//               budgetId: element.budgetId,
//               tagId: element.tagId,
//               monthly: element.monthly,
//               createdAt: element.createdAt,
//               lastUpdate: element.lastUpdate,
//               amount: element.amount,
//             };

//             response.push(obj);
//           }

//           return response;
//         } catch (error) {
//           throw error;
//         }
//       },
//     });
//   },
// });

export const CategoryPlanQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('getAllCategoryPlan', {
      type: 'CategoryPlan',
      description: 'Get all CategoryPlan for a particular user',
      args: {
        budgetId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with budget id',
          })
        ),
      },

      async resolve(__, {budgetId}, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const response = await prisma.categoryPlan.findMany({
            where: { budgetId: budgetId },
          });

          // const response = await prisma.categoryPlan.findMany({
          //   orderBy: [{ createdAt: 'desc' }],
          // });

          let responseArray: any[] = [];

          for (let i = 0; i < response.length; i++) {
            const element = response[i];

              const obj = {
                id: element.id,
                categoryId: element.categoryId,
                budgetId: element.budgetId,
                tagId: element.tagId,
                monthly: element.monthly,
                createdAt: element.createdAt,
                lastUpdate: element.lastUpdate,
                amount: element.amount,
              };

              responseArray.push(obj);
          }

          return responseArray;
        } catch (error) {
          throw error;
        }
      },
    });

    t.nonNull.field('getDetailCategoryPlan', {
      type: 'CategoryPlan',
      description: 'Get Detail CategoryPlan by Id',
      args: {
        categoryPlanId: nonNull(
          arg({
            type: 'String',
            description: 'Fill this with CategoryPlan id',
          })
        ),
      },

      async resolve(__, {categoryPlanId}, { userId, prisma }, ___) {
        try {
          if (!userId) throw new Error('Token tidak valid.');

          const categoryPlanDetail = await prisma.categoryPlan.findUnique({
            where: { id: categoryPlanId },
          });

          // const response = await prisma.categoryPlan.findMany({
          //   orderBy: [{ createdAt: 'desc' }],
          // });

          const response = {
            id: categoryPlanDetail.id,
            categoryId: categoryPlanDetail.categoryId,
            budgetId: categoryPlanDetail.budgetId,
            tagId: categoryPlanDetail.tagId,
            monthly: categoryPlanDetail.monthly,
            createdAt: categoryPlanDetail.createdAt,
            lastUpdate: categoryPlanDetail.lastUpdate,
            amount: categoryPlanDetail.amount,
          };

          return response;
        } catch (error) {
          throw error;
        }
      },
    });
  },
});
