export interface PrioritizedItem {
    readonly priority: number;
}

export class PriorityQueue<TItem extends PrioritizedItem> {
    private tree: TItem[] = [];

    private updateParents(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.tree[parentIndex];
            const child = this.tree[index];
            if (child.priority <= parent.priority) {
                // Invariant is satisfied
                return;
            }

            // Invariant is not satisfied; swap child and parent and then check the updated parent
            // TODO: Consolidate swap code
            this.tree[parentIndex] = child;
            this.tree[index] = parent;
            index = parentIndex;
        }
    }

    private updateChildren(index: number): void {
        while (index < this.tree.length) {
            let replacementIndex = index;

            const childLeftIndex = (index + 1) * 2 - 1;
            if (childLeftIndex < this.tree.length && this.tree[replacementIndex].priority < this.tree[childLeftIndex].priority) {
                replacementIndex = childLeftIndex;
            }

            const childRightIndex = childLeftIndex + 1;
            if (childRightIndex < this.tree.length && this.tree[replacementIndex].priority < this.tree[childRightIndex].priority) {
                replacementIndex = childRightIndex;
            }

            if (replacementIndex !== index) {
                // Invariant is not satisfied; swap
                const parent = this.tree[index];
                this.tree[index] = this.tree[replacementIndex]
                this.tree[replacementIndex] = parent;
                index = replacementIndex;
            } else {
                // Invariant is satisfied
                return;
            }
        }
    }

    enqueue(item: TItem): void {
        this.tree.push(item);
        this.updateParents(this.tree.length - 1);
    }

    dequeue(): TItem {
        if (this.tree.length <= 0) {
            throw "Priority queue is empty";
        }

        const item = this.tree[0];
        const lastItem = this.tree.pop() as TItem;
        if (this.tree.length > 0) {
            this.tree[0] = lastItem;
            this.updateChildren(0);
        }
        return item;
    }

    size(): number {
        return this.tree.length;
    }
}
