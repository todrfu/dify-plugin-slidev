import { TaskQueue } from '../../src/utils/task-queue';

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('TaskQueue', () => {
  let taskQueue: TaskQueue;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该使用默认并发数创建队列', () => {
    taskQueue = new TaskQueue();
    expect(taskQueue).toBeDefined();
  });

  it('应该使用指定的并发数创建队列', () => {
    taskQueue = new TaskQueue(5);
    expect(taskQueue).toBeDefined();
  });

  it('应该按顺序执行任务且不超过并发限制', async () => {
    // 设置并发数为 2
    taskQueue = new TaskQueue(2);

    // 跟踪任务执行状态
    const taskStatus = {
      running: 0,
      maxRunning: 0,
      completed: 0,
      order: [] as number[]
    };

    // 创建延迟函数
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 创建模拟任务
    const createTask = (id: number, duration: number) => async () => {
      taskStatus.running++;
      taskStatus.maxRunning = Math.max(taskStatus.maxRunning, taskStatus.running);
      taskStatus.order.push(id);

      await delay(duration);

      taskStatus.running--;
      taskStatus.completed++;

      return id;
    };

    // 添加6个任务到队列
    const tasks = [
      taskQueue.add(createTask(1, 100), 'task-1'),
      taskQueue.add(createTask(2, 50), 'task-2'),
      taskQueue.add(createTask(3, 150), 'task-3'),
      taskQueue.add(createTask(4, 80), 'task-4'),
      taskQueue.add(createTask(5, 120), 'task-5'),
      taskQueue.add(createTask(6, 30), 'task-6')
    ];

    // 等待所有任务完成
    const results = await Promise.all(tasks);

    // 验证结果
    expect(results).toEqual([1, 2, 3, 4, 5, 6]);
    expect(taskStatus.completed).toBe(6);
    expect(taskStatus.maxRunning).toBeLessThanOrEqual(2); // 确保并发任务不超过2个

    // 验证执行顺序（任务1和2应该先开始，然后是3和4，最后是5和6）
    expect(taskStatus.order.slice(0, 2)).toContain(1);
    expect(taskStatus.order.slice(0, 2)).toContain(2);
  }, 10000); // 增加超时时间，确保有足够时间完成所有任务

  it('应该正确处理任务成功的情况', async () => {
    taskQueue = new TaskQueue(1);

    const successTask = jest.fn().mockResolvedValue('成功结果');

    const result = await taskQueue.add(successTask, 'success-task');

    expect(successTask).toHaveBeenCalledTimes(1);
    expect(result).toBe('成功结果');
  });

  it('应该正确处理任务失败的情况', async () => {
    taskQueue = new TaskQueue(1);

    const error = new Error('任务失败');
    const failureTask = jest.fn().mockRejectedValue(error);

    await expect(taskQueue.add(failureTask, 'failure-task')).rejects.toThrow('任务失败');
    expect(failureTask).toHaveBeenCalledTimes(1);
  });

  it('当一个任务失败不应影响其他任务执行', async () => {
    taskQueue = new TaskQueue(1);

    const error = new Error('第一个任务失败');
    const failureTask = jest.fn().mockRejectedValue(error);
    const successTask = jest.fn().mockResolvedValue('第二个任务成功');

    // 添加一个失败的任务，一个成功的任务
    const task1 = taskQueue.add(failureTask, 'failure-task');
    const task2 = taskQueue.add(successTask, 'success-task');

    // 第一个任务应该失败
    await expect(task1).rejects.toThrow('第一个任务失败');

    // 第二个任务应该成功
    const result = await task2;
    expect(result).toBe('第二个任务成功');

    // 两个任务都应该被执行
    expect(failureTask).toHaveBeenCalledTimes(1);
    expect(successTask).toHaveBeenCalledTimes(1);
  });

  it('应该在队列满时正确排队任务', async () => {
    // 设置并发数为 1，确保任务会排队
    taskQueue = new TaskQueue(1);

    // 创建延迟函数
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 创建3个任务，每个任务都有不同的延迟
    const task1 = jest.fn(async () => {
      await delay(100);
      return 'task-1';
    });

    const task2 = jest.fn(async () => {
      await delay(50);
      return 'task-2';
    });

    const task3 = jest.fn(async () => {
      await delay(30);
      return 'task-3';
    });

    // 启动所有任务，但由于并发限制为1，它们应该按顺序执行
    const promise1 = taskQueue.add(task1, 'task-1');
    const promise2 = taskQueue.add(task2, 'task-2');
    const promise3 = taskQueue.add(task3, 'task-3');

    // 给第一个任务一点时间开始执行
    await delay(20);

    // 此时只有第一个任务应该被调用
    expect(task1).toHaveBeenCalledTimes(1);
    expect(task2).not.toHaveBeenCalled();
    expect(task3).not.toHaveBeenCalled();

    // 等待所有任务完成
    const results = await Promise.all([promise1, promise2, promise3]);

    // 验证所有任务都被执行
    expect(task1).toHaveBeenCalledTimes(1);
    expect(task2).toHaveBeenCalledTimes(1);
    expect(task3).toHaveBeenCalledTimes(1);

    // 验证返回的结果
    expect(results).toEqual(['task-1', 'task-2', 'task-3']);
  }, 5000);

  it('应该正确处理并发任务', async () => {
    // 设置并发数为 3
    taskQueue = new TaskQueue(3);

    // 创建延迟函数
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 跟踪当前运行的任务数
    let runningTasks = 0;
    let maxRunningTasks = 0;

    // 创建10个任务，每个都会更新并发计数
    const createTask = (id: number) => async () => {
      runningTasks++;
      maxRunningTasks = Math.max(maxRunningTasks, runningTasks);

      await delay(Math.random() * 100); // 随机延迟，使测试更真实

      runningTasks--;
      return id;
    };

    // 添加10个任务
    const promises = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(taskQueue.add(createTask(i), `task-${i}`));
    }

    // 等待所有任务完成
    const results = await Promise.all(promises);

    // 验证结果
    expect(results).toHaveLength(10);
    expect(maxRunningTasks).toBeLessThanOrEqual(3); // 确保最大并发数不超过3
    expect(runningTasks).toBe(0); // 确保所有任务都已完成
  });
});
