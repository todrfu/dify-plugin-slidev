/**
 * 请求队列管理类
 * 负责限制并发任务数量，确保系统资源合理使用
 */
export class TaskQueue {
  private queue: Array<{
    resolve: (value: any) => void
    reject: (error: Error) => void
    task: () => Promise<any>
    id: string
  }> = []
  private runningTasks = 0
  private maxConcurrent: number

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * 添加任务到队列
   * @param task 要执行的任务函数
   * @param id 任务ID，用于日志标识
   */
  add(task: () => Promise<any>, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, task, id })
      this.processQueue()
    })
  }

  /**
   * 处理队列中的任务
   * 当有空闲资源时会自动执行队列中的下一个任务
   */
  private processQueue() {
    if (this.runningTasks >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const { resolve, reject, task, id } = this.queue.shift()
    this.runningTasks++

    console.log(`[${id}] 开始执行队列中的任务，当前运行任务数: ${this.runningTasks}`)

    task()
      .then((result) => {
        resolve(result)
        console.log(`[${id}] 任务成功完成`)
      })
      .catch((error) => {
        reject(error)
        console.error(`[${id}] 任务执行失败:`, error)
      })
      .finally(() => {
        this.runningTasks--
        console.log(`[${id}] 任务结束，当前运行任务数: ${this.runningTasks}，队列中剩余任务: ${this.queue.length}`)
        this.processQueue()
      })
  }
}
