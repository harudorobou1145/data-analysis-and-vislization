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
    depth = 0
    last_closed_depth = 0
    for bracket in string:
        if bracket == '[':
            depth += 1
        elif bracket == ']' and depth > 0:
            # A pair closing above a completed inner pair establishes nesting.
            if last_closed_depth > depth:
                return True
            last_closed_depth = depth
            depth -= 1
    return False
