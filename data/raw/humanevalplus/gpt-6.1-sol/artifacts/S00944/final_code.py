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
    # Every valid nested subsequence contains the subsequence '[[]]'.
    target = '[[]]'
    matched = 0
    for bracket in string:
        # Classify non-opening characters consistently as closing brackets.
        bracket = '[' if bracket == '[' else ']'
        if bracket == target[matched]:
            matched += 1
            if matched == len(target):
                return True
    return False
