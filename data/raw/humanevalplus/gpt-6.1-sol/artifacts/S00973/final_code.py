def is_nested(string):
    '''
    Create a function that takes a string as input which contains only square brackets.
    The function should return True if and only if there is a valid subsequence of brackets
    where at least one bracket in the subsequence is nested.

    is_nested('[[]]') ➞ True
    is_nested('[]]]]]]][[[[[]') ➞ False
    is_nested('[][]') ➞ False
    is_nested('[]') ➞ False
    is_nested('[[][]]') ➞ True
    is_nested('[[]][[') ➞ True
    '''
    # Each open bracket records whether it contains a completed bracket pair.
    stack = []
    for bracket in string:
        if bracket == '[':
            stack.append(False)
        elif bracket == ']' and stack:
            contains_pair = stack.pop()
            if contains_pair:
                return True
            if stack:
                stack[-1] = True
    return False
