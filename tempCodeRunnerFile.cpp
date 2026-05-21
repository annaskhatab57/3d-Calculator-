#include <iostream>
#include <string>
using namespace std;

// Node structure for stack (Linked List)
struct Node {
    int data;
    Node* next;
};

// Push element onto stack
void push(Node*& top, int value) {
    Node* newNode = new Node;
    newNode->data = value;
    newNode->next = top;
    top = newNode;
    cout << "Element pushed successfully.\n";
}

// Pop element from stack
void pop(Node*& top) {
    if (top == NULL) {
        cout << "Stack is empty. Cannot pop.\n";
        return;
    }
    Node* temp = top;
    top = top->next;
    delete temp;
    cout << "Element popped successfully.\n";
}

// Display stack elements
void display(Node* top) {
    if (top == NULL) {
        cout << "Stack is empty.\n";
        return;
    }
    cout << "Stack elements: ";
    while (top != NULL) {
        cout << top->data << " ";
        top = top->next;
    }
    cout << endl;
}

// Find maximum element in stack
void findMax(Node* top) {
    if (top == NULL) {
        cout << "Stack is empty.\n";
        return;
    }
    int max = top->data;
    while (top != NULL) {
        if (top->data > max)
            max = top->data;
        top = top->next;
    }
    cout << "Maximum element: " << max << endl;
}

// Reverse stack using another stack
void reverseStack(Node*& top) {
    if (top == NULL) {
        cout << "Stack is empty.\n";
        return;
    }

    Node* tempStack = NULL;

    while (top != NULL) {
        push(tempStack, top->data);
        pop(top);
    }
    top = tempStack;
    cout << "Stack reversed successfully.\n";
}

// Check balanced symbols using stack
bool isBalanced(string exp) {
    Node* stack = NULL;

    for (char ch : exp) {
        if (ch == '(' || ch == '{' || ch == '[') {
            push(stack, ch);
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (stack == NULL)
                return false;

            char topChar = stack->data;
            pop(stack);

            if ((ch == ')' && topChar != '(') ||
                (ch == '}' && topChar != '{') ||
                (ch == ']' && topChar != '['))
                return false;
        }
    }
    return stack == NULL;
}

int main() {
    Node* top = NULL;
    int choice, value;
    string expression;

    do {
        cout << "\n--- Smart Stack Management System ---\n";
        cout << "1. Push element\n";
        cout << "2. Pop element\n";
        cout << "3. Display stack\n";
        cout << "4. Find maximum element\n";
        cout << "5. Reverse stack\n";
        cout << "6. Check balanced expression\n";
        cout << "0. Exit\n";
        cout << "Enter your choice: ";
        cin >> choice;

        switch (choice) {
            case 1:
                cout << "Enter value: ";
                cin >> value;
                push(top, value);
                break;

            case 2:
                pop(top);
                break;

            case 3:
                display(top);
                break;

            case 4:
                findMax(top);
                break;

            case 5:
                reverseStack(top);
                break;

            case 6:
                cout << "Enter expression: ";
                cin >> expression;
                if (isBalanced(expression))
                    cout << "Expression is balanced.\n";
                else
                    cout << "Expression is not balanced.\n";
                break;

            case 0:
                cout << "Exiting program.\n";
                break;

            default:
                cout << "Invalid choice.\n";
        }
    } while (choice != 0);

    return 0;
}
